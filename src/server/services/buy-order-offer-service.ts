import { ApiError } from "@/server/errors";
import * as offersRepo from "@/server/repositories/buy-order-offers";
import * as buyOrdersRepo from "@/server/repositories/buy-orders";
import * as conversationsRepo from "@/server/repositories/conversations";
import { getUserSummaries, getUserSummary } from "@/server/services/rating-service";
import * as pushService from "@/server/services/push-service";
import type { BuyOrderOfferDto, BuyOrderOfferStatus, UserSummaryDto } from "@/lib/types";
import type { OfferWithRelations } from "@/server/repositories/buy-order-offers";

/**
 * Luồng gom số lượng lớn (đảo chiều luồng mua): người mua đăng tin → người bán
 * chào bán công khai (số lượng + lời nhắn) → người mua (chủ tin) chọn 1 người
 * bán để 連携 → sinh conversation riêng. Conversation CHỈ tạo qua connect.
 */
function buildOfferDto(
  offer: OfferWithRelations,
  summary: UserSummaryDto | undefined,
  conversationId: string | null
): BuyOrderOfferDto {
  return {
    id: offer.id,
    buyOrderId: offer.buyOrderId,
    sellerId: offer.seller.id,
    sellerDisplayName: offer.seller.displayName,
    sellerIsVip: offer.seller.isVip,
    sellerRatingAvg: summary?.ratingAvg ?? null,
    sellerRatingCount: summary?.ratingCount ?? 0,
    sellerContributionCount: summary?.contributionCount ?? 0,
    quantity: offer.quantity,
    message: offer.message,
    status: offer.status as BuyOrderOfferStatus,
    conversationId,
    createdAt: offer.createdAt.toISOString(),
  };
}

async function toOfferDto(offer: OfferWithRelations): Promise<BuyOrderOfferDto> {
  const summary = await getUserSummary(offer.seller.id);
  // Hội thoại riêng chỉ có khi đã connected — key theo (buyOrderId, sellerId).
  const conversation =
    offer.status === "connected"
      ? await conversationsRepo.findBuyOrderConversationByPair(offer.buyOrderId, offer.seller.id)
      : null;
  return buildOfferDto(offer, summary, conversation?.id ?? null);
}

/**
 * Danh sách chào bán — công khai, ai cũng xem được (endpoint nóng: mount
 * effect của trang chi tiết tin gom). Batch uy tín + hội thoại thay vì
 * 3–4 query/chào bán.
 */
export async function listForOrder(buyOrderId: string): Promise<BuyOrderOfferDto[]> {
  const order = await buyOrdersRepo.findBuyOrderById(buyOrderId);
  if (!order) {
    throw new ApiError(404, "NOT_FOUND", "Không tìm thấy tin gom.");
  }
  const rows = await offersRepo.listOffersForOrder(buyOrderId);
  const [summaries, conversations] = await Promise.all([
    getUserSummaries(rows.map((row) => row.seller.id)),
    conversationsRepo.listBuyOrderConversations(buyOrderId),
  ]);
  const conversationBySeller = new Map(conversations.map((c) => [c.sellerId, c.id]));
  return rows.map((row) =>
    buildOfferDto(
      row,
      summaries.get(row.seller.id),
      row.status === "connected" ? conversationBySeller.get(row.seller.id) ?? null : null
    )
  );
}

/** Người bán đăng chào bán cho 1 tin gom. */
export async function create(
  sellerId: string,
  buyOrderId: string,
  input: { quantity: number; message?: string | null }
): Promise<BuyOrderOfferDto> {
  const order = await buyOrdersRepo.findBuyOrderById(buyOrderId);
  if (!order) {
    throw new ApiError(404, "NOT_FOUND", "Không tìm thấy tin gom.");
  }
  if (order.buyerId === sellerId) {
    throw new ApiError(409, "OWN_ORDER", "Không thể chào bán cho tin gom của chính mình.");
  }
  if (order.status !== "active") {
    throw new ApiError(409, "NOT_ACTIVE", "Tin gom này hiện không nhận chào bán.");
  }
  const existing = await offersRepo.findOffer(buyOrderId, sellerId);
  if (existing) {
    throw new ApiError(409, "ALREADY_OFFERED", "Bạn đã chào bán cho tin gom này rồi.");
  }
  const offer = await offersRepo.createOffer({
    buyOrderId,
    sellerId,
    quantity: input.quantity,
    message: input.message?.trim() || null,
  });
  console.log(`[buy-order] ${sellerId} offered on ${buyOrderId} (x${input.quantity})`);

  // Báo chủ tin gom có người chào bán (fire-and-forget, xem push-service).
  pushService.notify(order.buyerId, () => ({
    title: "Có người chào bán",
    body: pushService.preview(
      `${offer.seller.displayName} chào bán ${input.quantity} cho tin gom "${order.card.nameJa}".`
    ),
    url: `/buy-orders/${buyOrderId}`,
    tag: `offer-${buyOrderId}`,
  }));

  return toOfferDto(offer);
}

/** Người mua (chủ tin) chọn 1 chào bán → tạo/mở conversation riêng. Idempotent. */
export async function connect(
  userId: string,
  offerId: string
): Promise<{ offer: BuyOrderOfferDto; conversationId: string }> {
  const offer = await offersRepo.findOfferById(offerId);
  if (!offer) {
    throw new ApiError(404, "NOT_FOUND", "Không tìm thấy lượt chào bán.");
  }
  if (offer.buyOrder.buyerId !== userId) {
    throw new ApiError(403, "FORBIDDEN", "Chỉ người đăng tin gom mới kết nối được.");
  }
  const conversation = await conversationsRepo.findOrCreateBuyOrderConversation(
    offer.buyOrderId,
    offer.buyOrder.buyerId,
    offer.seller.id
  );
  const updated =
    offer.status === "connected" ? offer : await offersRepo.markConnected(offerId);
  console.log(`[buy-order] connected offer ${offerId} → conversation ${conversation.id}`);
  return { offer: await toOfferDto(updated), conversationId: conversation.id };
}

import { ApiError } from "@/server/errors";
import * as offersRepo from "@/server/repositories/buy-order-offers";
import * as buyOrdersRepo from "@/server/repositories/buy-orders";
import * as conversationsRepo from "@/server/repositories/conversations";
import { getUserSummary } from "@/server/services/rating-service";
import type { BuyOrderOfferDto, BuyOrderOfferStatus } from "@/lib/types";
import type { OfferWithRelations } from "@/server/repositories/buy-order-offers";

/**
 * Luồng gom số lượng lớn (đảo chiều luồng mua): người mua đăng tin → người bán
 * chào bán công khai (số lượng + lời nhắn) → người mua (chủ tin) chọn 1 người
 * bán để 連携 → sinh conversation riêng. Conversation CHỈ tạo qua connect.
 */
async function toOfferDto(offer: OfferWithRelations): Promise<BuyOrderOfferDto> {
  const summary = await getUserSummary(offer.seller.id);
  // Hội thoại riêng chỉ có khi đã connected — key theo (buyOrderId, sellerId).
  const conversation =
    offer.status === "connected"
      ? await conversationsRepo.findBuyOrderConversationByPair(offer.buyOrderId, offer.seller.id)
      : null;
  return {
    id: offer.id,
    buyOrderId: offer.buyOrderId,
    sellerId: offer.seller.id,
    sellerDisplayName: offer.seller.displayName,
    sellerRatingAvg: summary.ratingAvg,
    sellerRatingCount: summary.ratingCount,
    sellerContributionCount: summary.contributionCount,
    quantity: offer.quantity,
    message: offer.message,
    status: offer.status as BuyOrderOfferStatus,
    conversationId: conversation?.id ?? null,
    createdAt: offer.createdAt.toISOString(),
  };
}

/** Danh sách chào bán — công khai, ai cũng xem được. */
export async function listForOrder(buyOrderId: string): Promise<BuyOrderOfferDto[]> {
  const order = await buyOrdersRepo.findBuyOrderById(buyOrderId);
  if (!order) {
    throw new ApiError(404, "NOT_FOUND", "募集が見つかりません。");
  }
  const rows = await offersRepo.listOffersForOrder(buyOrderId);
  return Promise.all(rows.map(toOfferDto));
}

/** Người bán đăng chào bán cho 1 tin gom. */
export async function create(
  sellerId: string,
  buyOrderId: string,
  input: { quantity: number; message?: string | null }
): Promise<BuyOrderOfferDto> {
  const order = await buyOrdersRepo.findBuyOrderById(buyOrderId);
  if (!order) {
    throw new ApiError(404, "NOT_FOUND", "募集が見つかりません。");
  }
  if (order.buyerId === sellerId) {
    throw new ApiError(409, "OWN_ORDER", "自分の募集には応募できません。");
  }
  if (order.status !== "active") {
    throw new ApiError(409, "NOT_ACTIVE", "この募集は現在受付していません。");
  }
  const existing = await offersRepo.findOffer(buyOrderId, sellerId);
  if (existing) {
    throw new ApiError(409, "ALREADY_OFFERED", "既にこの募集に応募済みです。");
  }
  const offer = await offersRepo.createOffer({
    buyOrderId,
    sellerId,
    quantity: input.quantity,
    message: input.message?.trim() || null,
  });
  console.log(`[buy-order] ${sellerId} offered on ${buyOrderId} (x${input.quantity})`);
  return toOfferDto(offer);
}

/** Người mua (chủ tin) chọn 1 chào bán → tạo/mở conversation riêng. Idempotent. */
export async function connect(
  userId: string,
  offerId: string
): Promise<{ offer: BuyOrderOfferDto; conversationId: string }> {
  const offer = await offersRepo.findOfferById(offerId);
  if (!offer) {
    throw new ApiError(404, "NOT_FOUND", "応募が見つかりません。");
  }
  if (offer.buyOrder.buyerId !== userId) {
    throw new ApiError(403, "FORBIDDEN", "募集の投稿者のみ連携できます。");
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

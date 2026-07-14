import { ApiError } from "@/server/errors";
import * as requestsRepo from "@/server/repositories/requests";
import * as listingsRepo from "@/server/repositories/listings";
import * as conversationsRepo from "@/server/repositories/conversations";
import { getUserSummary } from "@/server/services/rating-service";
import type { PurchaseRequestDto, PurchaseRequestStatus } from "@/lib/types";
import type { RequestWithRelations } from "@/server/repositories/requests";

/**
 * Luồng mua (thay thế chat trực tiếp): buyer gửi 購入希望 → seller xem danh
 * sách kèm uy tín → seller 連携 với người mình chọn → sinh conversation riêng.
 * Conversation CHỈ được tạo qua connect — seller toàn quyền chọn đối tác.
 */
async function toRequestDto(request: RequestWithRelations): Promise<PurchaseRequestDto> {
  const summary = await getUserSummary(request.buyer.id);
  const conversation =
    request.status === "connected"
      ? await conversationsRepo.findConversationByPair(request.listingId, request.buyerId)
      : null;
  return {
    id: request.id,
    listingId: request.listingId,
    buyerId: request.buyer.id,
    buyerDisplayName: request.buyer.displayName,
    buyerRatingAvg: summary.ratingAvg,
    buyerRatingCount: summary.ratingCount,
    buyerContributionCount: summary.contributionCount,
    status: request.status as PurchaseRequestStatus,
    conversationId: conversation?.id ?? null,
    createdAt: request.createdAt.toISOString(),
  };
}

export async function create(userId: string, listingId: string): Promise<PurchaseRequestDto> {
  const listing = await listingsRepo.findListingById(listingId);
  if (!listing) {
    throw new ApiError(404, "NOT_FOUND", "出品が見つかりません。");
  }
  if (listing.sellerId === userId) {
    throw new ApiError(409, "OWN_LISTING", "自分の出品には購入希望を送れません。");
  }
  if (listing.status !== "active") {
    throw new ApiError(409, "NOT_ACTIVE", "この出品は現在受付していません。");
  }
  const existing = await requestsRepo.findRequest(listingId, userId);
  if (existing) {
    throw new ApiError(409, "ALREADY_REQUESTED", "既に購入希望を送信済みです。");
  }
  const request = await requestsRepo.createRequest(listingId, userId);
  console.log(`[request] ${userId} wants to buy listing ${listingId}`);
  return toRequestDto(request);
}

/** Danh sách người muốn mua — CHỈ seller được xem. */
export async function listForSeller(
  userId: string,
  listingId: string
): Promise<PurchaseRequestDto[]> {
  const listing = await listingsRepo.findListingById(listingId);
  if (!listing) {
    throw new ApiError(404, "NOT_FOUND", "出品が見つかりません。");
  }
  if (listing.sellerId !== userId) {
    throw new ApiError(403, "FORBIDDEN", "出品者のみ購入希望一覧を見られます。");
  }
  const rows = await requestsRepo.listRequestsForListing(listingId);
  return Promise.all(rows.map(toRequestDto));
}

/** Trạng thái request của chính viewer trên 1 listing (null nếu chưa gửi). */
export async function getMine(
  userId: string,
  listingId: string
): Promise<PurchaseRequestDto | null> {
  const request = await requestsRepo.findRequest(listingId, userId);
  return request ? toRequestDto(request) : null;
}

/** Seller kết nối với buyer đã chọn → tạo/mở conversation riêng. Idempotent. */
export async function connect(
  userId: string,
  requestId: string
): Promise<{ request: PurchaseRequestDto; conversationId: string }> {
  const request = await requestsRepo.findRequestById(requestId);
  if (!request) {
    throw new ApiError(404, "NOT_FOUND", "購入希望が見つかりません。");
  }
  if (request.listing.sellerId !== userId) {
    throw new ApiError(403, "FORBIDDEN", "出品者のみ連携できます。");
  }
  const conversation = await conversationsRepo.findOrCreateConversation(
    request.listingId,
    request.buyerId
  );
  const updated =
    request.status === "connected" ? request : await requestsRepo.markConnected(requestId);
  console.log(`[request] connected ${requestId} → conversation ${conversation.id}`);
  return { request: await toRequestDto(updated), conversationId: conversation.id };
}

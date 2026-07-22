import { ApiError } from "@/server/errors";
import * as ratingsRepo from "@/server/repositories/ratings";
import * as tradesRepo from "@/server/repositories/trades";
import * as usersRepo from "@/server/repositories/users";
import * as listingsRepo from "@/server/repositories/listings";
import * as conversationsRepo from "@/server/repositories/conversations";
import type { RatingDto, TradeRatingStateDto, UserSummaryDto } from "@/lib/types";
import type { Rating } from "@prisma/client";

// Sau khi trade chốt + CẢ 2 đã đánh giá: 1 ngày sau xóa nội dung chat của hội
// thoại đó (chủ web quyết định — dọn chat cũ, bảo vệ riêng tư). Sweep ở chat-service.
const CHAT_PURGE_DELAY_MS = 24 * 60 * 60 * 1000;

function toRatingDto(rating: Rating): RatingDto {
  return {
    id: rating.id,
    tradeId: rating.tradeId,
    raterId: rating.raterId,
    rateeId: rating.rateeId,
    score: rating.score,
    comment: rating.comment,
    createdAt: rating.createdAt.toISOString(),
  };
}

/**
 * Blind-mutual rating: chỉ rate được trade đã chốt, mỗi bên 1 lần.
 * Rating của đối phương CHỈ hiện khi cả 2 đã rate — chống trả đũa.
 * Rating không liên quan việc lưu giá (giá đã lưu lúc chốt trade).
 */
export async function rate(
  userId: string,
  tradeId: string,
  input: { score: number; comment?: string | null }
): Promise<RatingDto> {
  const trade = await tradesRepo.findTradeById(tradeId);
  if (!trade) {
    throw new ApiError(404, "NOT_FOUND", "Không tìm thấy giao dịch.");
  }
  if (trade.buyerId !== userId && trade.sellerId !== userId) {
    throw new ApiError(403, "FORBIDDEN", "Bạn không tham gia giao dịch này.");
  }
  if (trade.status !== "confirmed" && trade.status !== "self_reported") {
    throw new ApiError(409, "TRADE_NOT_CLOSED", "Chỉ đánh giá được giao dịch đã hoàn tất.");
  }
  const existing = await ratingsRepo.findRatingsByTrade(tradeId);
  if (existing.some((r) => r.raterId === userId)) {
    throw new ApiError(409, "ALREADY_RATED", "Bạn đã đánh giá giao dịch này rồi.");
  }
  const rateeId = trade.buyerId === userId ? trade.sellerId : trade.buyerId;
  const rating = await ratingsRepo.createRating({
    tradeId,
    raterId: userId,
    rateeId,
    score: input.score,
    comment: input.comment?.trim() || null,
  });
  console.log(`[rating] ${userId} rated trade ${tradeId} (score ${input.score})`);

  // Rating này là cái thứ 2 → trade "hoàn tất trọn vẹn" (giao dịch + cả 2 đánh
  // giá). Đây là mốc DUY NHẤT đóng tin đăng: suốt lúc thương lượng/chốt giá
  // tin vẫn active (hiện trên bảng + nhận thêm 購入希望); chỉ khi chốt giá
  // XONG và cả 2 đánh giá xong tin mới closed. Cũng hẹn xóa nội dung chat sau
  // 1 ngày. Cả hai thao tác idempotent nên gọi ở đây an toàn.
  if (existing.length + 1 >= 2) {
    await conversationsRepo.setMessagesPurgeAt(
      trade.conversationId,
      new Date(Date.now() + CHAT_PURGE_DELAY_MS)
    );
    console.log(`[chat] scheduled purge for conversation ${trade.conversationId} (+1 day)`);
    // Trade từ buy-order không có listing (tin gom tự gỡ khi đủ). closeIfActive
    // không ghi đè tin đã hủy/đóng do người bán tự thao tác trước đó.
    if (trade.listingId) {
      const res = await listingsRepo.closeListingIfActive(trade.listingId);
      if (res.count > 0) {
        console.log(`[listing] closed ${trade.listingId} (giao dịch + đánh giá xong)`);
      }
    }
  }
  return toRatingDto(rating);
}

/** Trạng thái rating của trade dưới góc nhìn viewer (đã ẩn theo blind rule). */
export async function getState(
  userId: string,
  tradeId: string
): Promise<TradeRatingStateDto> {
  const trade = await tradesRepo.findTradeById(tradeId);
  if (!trade) {
    throw new ApiError(404, "NOT_FOUND", "Không tìm thấy giao dịch.");
  }
  if (trade.buyerId !== userId && trade.sellerId !== userId) {
    throw new ApiError(403, "FORBIDDEN", "Bạn không tham gia giao dịch này.");
  }
  const ratings = await ratingsRepo.findRatingsByTrade(tradeId);
  const mine = ratings.find((r) => r.raterId === userId) ?? null;
  const theirs = ratings.find((r) => r.raterId !== userId) ?? null;
  const revealed = ratings.length >= 2;
  return {
    myRating: mine ? toRatingDto(mine) : null,
    // Blind: chưa đủ 2 rating thì không tiết lộ rating (kể cả sự tồn tại nội dung)
    counterpartRating: revealed && theirs ? toRatingDto(theirs) : null,
    revealed,
  };
}

function summarize(
  user: { id: string; displayName: string; isVip: boolean; createdAt: Date },
  revealed: { score: number }[],
  contributionCount: number
): UserSummaryDto {
  const ratingAvg =
    revealed.length > 0
      ? Math.round(
          (revealed.reduce((sum, r) => sum + r.score, 0) / revealed.length) * 10
        ) / 10
      : null;
  return {
    id: user.id,
    displayName: user.displayName,
    isVip: user.isVip,
    ratingAvg,
    ratingCount: revealed.length,
    contributionCount,
    memberSince: user.createdAt.toISOString(),
  };
}

/**
 * Bản batch của getUserSummary — 4 query cho CẢ danh sách user thay vì
 * 3 query/user (dùng cho danh sách chào bán công khai, endpoint nóng).
 */
export async function getUserSummaries(
  userIds: string[]
): Promise<Map<string, UserSummaryDto>> {
  const [users, revealed, contributions] = await Promise.all([
    ratingsRepo.findUsersByIds(userIds),
    ratingsRepo.listRevealedRatingsForUsers(userIds),
    usersRepo.countContributionsForUsers(userIds),
  ]);
  const byUser = new Map<string, UserSummaryDto>();
  for (const user of users) {
    const mine = revealed.filter((r) => r.rateeId === user.id);
    byUser.set(user.id, summarize(user, mine, contributions.get(user.id) ?? 0));
  }
  return byUser;
}

/** Hồ sơ công khai: ★ trung bình (chỉ từ rating đã reveal) + số giao dịch. */
export async function getUserSummary(userId: string): Promise<UserSummaryDto> {
  const user = await ratingsRepo.findUserById(userId);
  if (!user) {
    throw new ApiError(404, "NOT_FOUND", "Không tìm thấy người dùng.");
  }
  const [revealed, contributionCount] = await Promise.all([
    ratingsRepo.listRevealedRatingsForUser(userId),
    usersRepo.countContributions(userId),
  ]);
  return summarize(user, revealed, contributionCount);
}

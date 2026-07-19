import { ApiError } from "@/server/errors";
import * as ratingsRepo from "@/server/repositories/ratings";
import * as tradesRepo from "@/server/repositories/trades";
import * as reportsRepo from "@/server/repositories/reports";
import * as listingService from "@/server/services/listing-service";
import type {
  BadgeKey,
  ProfileSafetyDto,
  SafetyLevel,
  TrainerTier,
  UserProfileDto,
} from "@/lib/types";

// ============================================================
// XP & Level — thuần derived từ lịch sử, KHÔNG lưu cột (cùng triết lý
// contributionCount/ratingAvg). Hệ quả quan trọng: không có sự kiện cộng/trừ
// XP nào phải ghi sổ → không farm được bằng hành động lặp (đăng nhập, spam
// đăng tin đều KHÔNG cho XP — lệch spec gốc có chủ đích, lý do: mọi nguồn XP
// phải bám vào việc THẬT đã xảy ra trên chợ, thứ duy nhất không giả được).
// ============================================================

export const XP_PER_TRADE = 30;
export const XP_PER_FIVE_STAR = 10;
/** thưởng mỗi 30 ngày "sạch" (không có vi phạm đã xác minh) */
export const XP_PER_CLEAN_MONTH = 100;
export const XP_PER_LEVEL = 100;

export function computeXp(input: {
  closedTrades: number;
  fiveStarCount: number;
  /** số ngày từ lần vi phạm xác minh gần nhất (hoặc từ ngày tạo tài khoản) */
  cleanDays: number;
}): number {
  return (
    input.closedTrades * XP_PER_TRADE +
    input.fiveStarCount * XP_PER_FIVE_STAR +
    Math.floor(Math.max(0, input.cleanDays) / 30) * XP_PER_CLEAN_MONTH
  );
}

export function levelFromXp(xp: number): number {
  return 1 + Math.floor(Math.max(0, xp) / XP_PER_LEVEL);
}

/**
 * Level hiển thị. VIP (do chủ web chỉ định) có SÀN level 10 — nếu tự đạt cao
 * hơn thì giữ mức cao hơn, không bao giờ bị kéo tụt xuống.
 */
export function displayLevel(xp: number, isVip: boolean): number {
  const level = levelFromXp(xp);
  return isVip ? Math.max(10, level) : level;
}

/** Bậc theo spec: Bronze 1–10, Silver 11–25, Gold 26–50, Platinum 51–80, Master 81–100, Legendary 100+ */
export function tierFromLevel(level: number): TrainerTier {
  if (level > 100) return "legendary";
  if (level > 80) return "master";
  if (level > 50) return "platinum";
  if (level > 25) return "gold";
  if (level > 10) return "silver";
  return "bronze";
}

// ============================================================
// Trust Score 0–100 — chỉ số uy tín CHÍNH (level/XP chỉ để gắn kết).
// Người mới = 50 (trung lập). Rating chiếm trọng số lớn nhất (±20);
// distinct partners chống bơm điểm bằng trade lặp với 1 đồng bọn;
// report ĐÃ XÁC MINH phạt nặng (-25/lần) — report chờ xử lý KHÔNG trừ điểm
// (chưa kết luận thì chưa phạt).
// ============================================================

export function computeTrustScore(input: {
  closedTrades: number;
  distinctPartners: number;
  cancelledTrades: number;
  accountAgeDays: number;
  ratingAvg: number | null;
  verifiedReports: number;
}): number {
  let score = 50;
  score += Math.min(10, input.closedTrades);
  score += Math.min(10, input.distinctPartners);
  score += Math.min(10, Math.floor(input.accountAgeDays / 30));
  if (input.ratingAvg !== null) {
    score += Math.max(-20, Math.min(20, Math.round((input.ratingAvg - 3) * 10)));
  }
  const total = input.closedTrades + input.cancelledTrades;
  if (total > 0) {
    const rate = input.closedTrades / total;
    // ≥90% hoàn thành: không phạt; dưới đó phạt tới -15
    if (rate < 0.9) score -= Math.min(15, Math.round((0.9 - rate) * 50));
  }
  score -= Math.min(50, input.verifiedReports * 25);
  return Math.max(0, Math.min(100, score));
}

// ============================================================
// Badge — derived, không lưu. Các badge cần đo thời gian phản hồi (Fast
// Reply/Fast Trade) hay membership (VIP) chưa có hạ tầng đo → chưa làm.
// ============================================================

export function computeBadges(input: {
  closedTrades: number;
  closedAsSeller: number;
  ratingAvg: number | null;
  ratingCount: number;
  trustScore: number;
  verifiedReports: number;
  accountAgeDays: number;
}): BadgeKey[] {
  const badges: BadgeKey[] = [];
  if (input.closedTrades >= 500) badges.push("trades500");
  else if (input.closedTrades >= 100) badges.push("trades100");
  else if (input.closedTrades >= 10) badges.push("trades10");
  if (input.closedAsSeller >= 50) badges.push("topSeller");
  if (input.trustScore >= 80) badges.push("trustedTrader");
  // Perfect Rating cần đủ mẫu — 5.0 với 2 rating không nói lên gì
  if (input.ratingAvg === 5 && input.ratingCount >= 10) badges.push("perfectRating");
  // No Report phải "có hoạt động mà vẫn sạch" — tài khoản mới tinh chưa tính
  if (input.verifiedReports === 0 && input.closedTrades >= 5 && input.accountAgeDays >= 30) {
    badges.push("noReport");
  }
  if (input.accountAgeDays >= 365) badges.push("oneYear");
  return badges;
}

// ============================================================
// Trust & Safety — 🔴 chỉ khi vi phạm ĐÃ xác minh; 🟡 cần ≥2 NGƯỜI KHÁC NHAU
// đang report (1 report lẻ chưa duyệt không đổi hiển thị công khai — chống
// report bẩn, đúng mục tiêu spec "chống lạm dụng report").
// ============================================================

export function safetyLevel(verifiedCount: number, pendingReporters: number): SafetyLevel {
  if (verifiedCount > 0) return "red";
  if (pendingReporters >= 2) return "yellow";
  return "green";
}

const RECENT_REVIEWS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Hồ sơ công khai đầy đủ — mọi chỉ số derived tại thời điểm xem. */
export async function getProfile(userId: string): Promise<UserProfileDto> {
  const user = await ratingsRepo.findUserById(userId);
  if (!user) {
    throw new ApiError(404, "NOT_FOUND", "ユーザーが見つかりません。");
  }
  const [revealed, tradeStats, reportStats, reviews, listings] = await Promise.all([
    ratingsRepo.listRevealedRatingsForUser(userId),
    tradesRepo.getTradeStatsForUser(userId),
    reportsRepo.getReportStatsForUser(userId),
    ratingsRepo.listRecentRevealedReviews(userId, RECENT_REVIEWS),
    listingService.list({ sellerId: userId, status: "active", page: 1 }),
  ]);

  const ratingAvg =
    revealed.length > 0
      ? Math.round((revealed.reduce((s, r) => s + r.score, 0) / revealed.length) * 10) / 10
      : null;
  const now = Date.now();
  const accountAgeDays = Math.floor((now - user.createdAt.getTime()) / DAY_MS);
  const cleanSince = reportStats.lastVerifiedAt ?? user.createdAt;
  const xp = computeXp({
    closedTrades: tradeStats.closedTrades,
    fiveStarCount: revealed.filter((r) => r.score === 5).length,
    cleanDays: Math.floor((now - cleanSince.getTime()) / DAY_MS),
  });
  const level = displayLevel(xp, user.isVip);
  const trustScore = computeTrustScore({
    closedTrades: tradeStats.closedTrades,
    distinctPartners: tradeStats.distinctPartners,
    cancelledTrades: tradeStats.cancelledTrades,
    accountAgeDays,
    ratingAvg,
    verifiedReports: reportStats.verifiedCount,
  });
  const totalOutcomes = tradeStats.closedTrades + tradeStats.cancelledTrades;
  const safety: ProfileSafetyDto = {
    level: safetyLevel(reportStats.verifiedCount, reportStats.pendingReporters),
    verifiedCount: reportStats.verifiedCount,
    pendingReporters: reportStats.pendingReporters,
    lastVerifiedAt: reportStats.lastVerifiedAt?.toISOString() ?? null,
  };

  return {
    id: user.id,
    displayName: user.displayName,
    isVip: user.isVip,
    memberSince: user.createdAt.toISOString(),
    ratingAvg,
    ratingCount: revealed.length,
    xp,
    level,
    tier: tierFromLevel(level),
    xpIntoLevel: xp % XP_PER_LEVEL,
    xpPerLevel: XP_PER_LEVEL,
    trustScore,
    badges: computeBadges({
      closedTrades: tradeStats.closedTrades,
      closedAsSeller: tradeStats.closedAsSeller,
      ratingAvg,
      ratingCount: revealed.length,
      trustScore,
      verifiedReports: reportStats.verifiedCount,
      accountAgeDays,
    }),
    stats: {
      closedTrades: tradeStats.closedTrades,
      distinctPartners: tradeStats.distinctPartners,
      cancelledTrades: tradeStats.cancelledTrades,
      completionRate:
        totalOutcomes > 0
          ? Math.round((tradeStats.closedTrades / totalOutcomes) * 100) / 100
          : null,
    },
    safety,
    recentReviews: reviews.map((r) => ({
      score: r.score,
      comment: r.comment,
      raterDisplayName: r.rater.displayName,
      raterIsVip: r.rater.isVip,
      createdAt: r.createdAt.toISOString(),
    })),
    activeListings: listings.listings,
  };
}

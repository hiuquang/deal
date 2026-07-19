import { prisma } from "@/server/db";

export function findRatingsByTrade(tradeId: string) {
  return prisma.rating.findMany({ where: { tradeId } });
}

export function createRating(data: {
  tradeId: string;
  raterId: string;
  rateeId: string;
  score: number;
  comment: string | null;
}) {
  return prisma.rating.create({ data });
}

/**
 * Rating đã reveal của 1 user = rating nhận được từ các trade có đủ 2 rating.
 * Đếm số rating theo trade rồi lọc — dữ liệu nhỏ, đủ cho MVP.
 */
export async function listRevealedRatingsForUser(rateeId: string) {
  const ratings = await prisma.rating.findMany({
    where: { rateeId },
    include: { trade: { select: { _count: { select: { ratings: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return ratings.filter((r) => r.trade._count.ratings >= 2);
}

/** Bản batch của listRevealedRatingsForUser — 1 query cho nhiều user. */
export async function listRevealedRatingsForUsers(rateeIds: string[]) {
  if (rateeIds.length === 0) return [];
  const ratings = await prisma.rating.findMany({
    where: { rateeId: { in: rateeIds } },
    include: { trade: { select: { _count: { select: { ratings: true } } } } },
  });
  return ratings.filter((r) => r.trade._count.ratings >= 2);
}

/**
 * Review mới nhất cho hồ sơ công khai — kèm tên người đánh giá (khác
 * listRevealedRatingsForUser: hàm đó phục vụ tính ★ nên không join rater).
 * Vẫn chỉ lấy rating đã reveal (đủ 2 chiều) — blind-mutual không đổi.
 */
export async function listRecentRevealedReviews(rateeId: string, limit: number) {
  const ratings = await prisma.rating.findMany({
    where: { rateeId },
    include: {
      rater: { select: { displayName: true, isVip: true } },
      trade: { select: { _count: { select: { ratings: true } } } },
    },
    orderBy: { createdAt: "desc" },
    // lấy dư rồi lọc revealed — trade thiếu rating chiều kia sẽ bị loại
    take: limit * 3,
  });
  return ratings.filter((r) => r.trade._count.ratings >= 2).slice(0, limit);
}

export function findUserById(id: string) {
  return prisma.user.findFirst({ where: { id, deletedAt: null } });
}

export function findUsersByIds(ids: string[]) {
  if (ids.length === 0) return Promise.resolve([]);
  return prisma.user.findMany({ where: { id: { in: ids }, deletedAt: null } });
}

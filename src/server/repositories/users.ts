import { prisma } from "@/server/db";

export function findByEmail(email: string) {
  return prisma.user.findFirst({ where: { email, deletedAt: null } });
}

export function createUser(data: {
  email: string;
  passwordHash: string;
  displayName: string;
  termsAcceptedVersion: string;
  termsAcceptedAt: Date;
}) {
  return prisma.user.create({ data });
}

export function acceptTerms(userId: string, version: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { termsAcceptedVersion: version, termsAcceptedAt: new Date() },
  });
}

/**
 * Số giao dịch đã đóng góp dữ liệu giá (confirmed hoặc self_reported)
 * mà user tham gia — derived, không lưu vào bảng users.
 */
export function countContributions(userId: string) {
  return prisma.trade.count({
    where: {
      status: { in: ["confirmed", "self_reported"] },
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
  });
}

/** Bản batch của countContributions — 2 groupBy thay vì 1 count/user. */
export async function countContributionsForUsers(
  userIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>(userIds.map((id) => [id, 0]));
  if (userIds.length === 0) return counts;
  const done = { in: ["confirmed", "self_reported"] };
  const [asBuyer, asSeller] = await Promise.all([
    prisma.trade.groupBy({
      by: ["buyerId"],
      where: { status: done, buyerId: { in: userIds } },
      _count: true,
    }),
    prisma.trade.groupBy({
      by: ["sellerId"],
      where: { status: done, sellerId: { in: userIds } },
      _count: true,
    }),
  ]);
  for (const row of asBuyer) counts.set(row.buyerId, (counts.get(row.buyerId) ?? 0) + row._count);
  for (const row of asSeller) counts.set(row.sellerId, (counts.get(row.sellerId) ?? 0) + row._count);
  return counts;
}

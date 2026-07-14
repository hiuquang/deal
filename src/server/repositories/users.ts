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

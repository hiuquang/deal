import { randomBytes } from "crypto";
import { prisma } from "@/server/db";

/** Tạo token mới, đồng thời vô hiệu token cũ cùng loại của user. */
export async function issueToken(
  userId: string,
  type: "verify" | "reset",
  ttlMs: number
) {
  await prisma.emailToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });
  return prisma.emailToken.create({
    data: {
      userId,
      type,
      token: randomBytes(32).toString("hex"),
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });
}

/** Token hợp lệ = đúng loại, chưa dùng, chưa hết hạn. */
export function findValidToken(token: string, type: "verify" | "reset") {
  return prisma.emailToken.findFirst({
    where: { token, type, usedAt: null, expiresAt: { gt: new Date() } },
    include: { user: true },
  });
}

export function markTokenUsed(id: string) {
  return prisma.emailToken.update({ where: { id }, data: { usedAt: new Date() } });
}

export function markEmailVerified(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date() },
  });
}

export function updatePassword(userId: string, passwordHash: string) {
  return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

/** Đăng xuất mọi thiết bị — gọi sau khi đổi mật khẩu. */
export function deleteAllSessions(userId: string) {
  return prisma.session.deleteMany({ where: { userId } });
}

export function listOutbox(limit = 20) {
  return prisma.emailOutbox.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

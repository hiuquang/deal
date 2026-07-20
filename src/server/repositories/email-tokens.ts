import { randomBytes } from "crypto";
import { prisma } from "@/server/db";
import { hashToken } from "@/server/token-hash";

/**
 * Tạo token mới, đồng thời vô hiệu token cũ cùng loại của user. DB chỉ lưu hash;
 * TRẢ VỀ token thô để nhét vào link email (chỉ tồn tại trong RAM lúc gửi mail).
 */
export async function issueToken(
  userId: string,
  type: "verify" | "reset",
  ttlMs: number
): Promise<string> {
  await prisma.emailToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });
  const rawToken = randomBytes(32).toString("hex");
  await prisma.emailToken.create({
    data: {
      userId,
      type,
      token: hashToken(rawToken),
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });
  return rawToken;
}

/** Token hợp lệ = đúng loại, chưa dùng, chưa hết hạn. Tra theo hash của token thô. */
export function findValidToken(token: string, type: "verify" | "reset") {
  return prisma.emailToken.findFirst({
    where: { token: hashToken(token), type, usedAt: null, expiresAt: { gt: new Date() } },
    include: { user: true },
  });
}

/**
 * Tra token kèm user BẤT KỂ đã dùng/hết hạn — để verifyEmail idempotent:
 * link bấm lần 2 (hoặc mail scanner prefetch đốt token trước) vẫn nhận ra
 * "user này đã verify rồi" thay vì báo lỗi.
 */
export function findTokenWithUser(token: string, type: "verify" | "reset") {
  return prisma.emailToken.findFirst({
    where: { token: hashToken(token), type },
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

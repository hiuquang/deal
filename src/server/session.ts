import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import type { User } from "@prisma/client";
import { prisma } from "@/server/db";
import { ApiError, unauthorized } from "@/server/errors";
import { TERMS_VERSION } from "@/lib/terms";
import { hashToken } from "@/server/token-hash";

const COOKIE_NAME = "deal_session";
const SESSION_DAYS = 30;

export async function createSession(userId: string): Promise<void> {
  // Token thô đi vào cookie của user; DB chỉ lưu hash (không đảo ngược được).
  const rawToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { token: hashToken(rawToken), userId, expiresAt } });

  const store = await cookies();
  store.set(COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const rawToken = store.get(COOKIE_NAME)?.value;
  if (rawToken) {
    await prisma.session.deleteMany({ where: { token: hashToken(rawToken) } });
  }
  store.delete(COOKIE_NAME);
}

/** User hiện tại theo cookie session, hoặc null nếu chưa đăng nhập/hết hạn. */
export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const rawToken = store.get(COOKIE_NAME)?.value;
  if (!rawToken) return null;

  const session = await prisma.session.findUnique({
    where: { token: hashToken(rawToken) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || session.user.deletedAt) {
    return null;
  }
  return session.user;
}

/** Như getSessionUser nhưng throw 401 — dùng cho endpoint bắt buộc đăng nhập. */
export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw unauthorized();
  return user;
}

/**
 * Bắt buộc đã xác nhận email + đã đồng ý bản 利用規約 hiện hành — dùng cho
 * MỌI hành động ghi (đăng tin, chat, trade, comment, rating...).
 */
export async function requireVerifiedUser(): Promise<User> {
  const user = await requireUser();
  if (!user.emailVerifiedAt) {
    throw new ApiError(
      403,
      "EMAIL_NOT_VERIFIED",
      "この操作にはメールアドレスの確認が必要です。受信箱の確認メールをご確認ください。"
    );
  }
  if (user.termsAcceptedVersion !== TERMS_VERSION) {
    throw new ApiError(
      403,
      "TERMS_NOT_ACCEPTED",
      "最新の利用規約への同意が必要です。画面の案内に従って同意してください。"
    );
  }
  return user;
}

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
 * Chỉ CHỦ WEB — gate cho khu quản trị (nhập giá 買取 từ X…).
 *
 * Dự án không có hệ phân quyền: VIP bật tay trong Supabase, report duyệt tay.
 * Dựng cả bảng role cho đúng một người dùng là thừa, nên chủ web nhận diện
 * bằng env `OWNER_USER_ID`.
 *
 * ⚠️ Thiếu env → CHẶN HẾT (404), không phải mở hết. Cấu hình sót trên môi
 * trường mới mà hoá ra mở toang khu quản trị thì tệ hơn nhiều so với việc chủ
 * web phải thêm một biến env.
 *
 * Trả 404 chứ không 403: người lạ dò trúng URL thì không có lý do gì để biết
 * là ở đây CÓ một trang mà họ không được vào.
 */
export async function requireOwner(): Promise<User> {
  const ownerId = process.env.OWNER_USER_ID;
  const user = await getSessionUser();
  if (!ownerId || !user || user.id !== ownerId) {
    throw new ApiError(404, "NOT_FOUND", "Không tìm thấy trang.");
  }
  return user;
}

/** Chủ web đã cấu hình và đang đăng nhập? Dùng để ẩn/hiện lối vào khu quản trị. */
export async function isOwner(): Promise<boolean> {
  const ownerId = process.env.OWNER_USER_ID;
  if (!ownerId) return false;
  const user = await getSessionUser();
  return user?.id === ownerId;
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
      "Thao tác này cần xác nhận email. Vui lòng kiểm tra email xác nhận trong hộp thư."
    );
  }
  if (user.termsAcceptedVersion !== TERMS_VERSION) {
    throw new ApiError(
      403,
      "TERMS_NOT_ACCEPTED",
      "Bạn cần đồng ý với Điều khoản sử dụng mới nhất. Vui lòng làm theo hướng dẫn trên màn hình."
    );
  }
  return user;
}

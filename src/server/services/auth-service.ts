import bcrypt from "bcryptjs";
import { ApiError } from "@/server/errors";
import * as users from "@/server/repositories/users";
import * as tokens from "@/server/repositories/email-tokens";
import { appUrl, sendMail } from "@/server/mailer";
import { TERMS_VERSION } from "@/lib/terms";
import { toUserDto } from "@/server/serializers";
import type { MeDto, UserDto } from "@/lib/types";
import type { User } from "@prisma/client";

const VERIFY_TTL = 24 * 60 * 60 * 1000; // 24h
const RESET_TTL = 60 * 60 * 1000; // 1h

async function sendVerificationMail(user: User): Promise<void> {
  const rawToken = await tokens.issueToken(user.id, "verify", VERIFY_TTL);
  await sendMail(
    user.email,
    "【DEAL】Xác nhận địa chỉ email",
    `${user.displayName} thân mến,\n\n` +
      `Cảm ơn bạn đã đăng ký DEAL.\n` +
      `Nhấn vào liên kết dưới đây để xác nhận email (hiệu lực 24 giờ):\n\n` +
      `${appUrl()}/verify?token=${rawToken}\n\n` +
      `Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.`
  );
}

export async function register(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<{ dto: UserDto; user: User }> {
  const existing = await users.findByEmail(input.email);
  if (existing) {
    throw new ApiError(409, "EMAIL_TAKEN", "Địa chỉ email này đã được đăng ký.");
  }
  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await users.createUser({
    email: input.email,
    passwordHash,
    displayName: input.displayName,
    // Đăng ký = đã tick đồng ý (registerSchema ép agreeTerms=true)
    termsAcceptedVersion: TERMS_VERSION,
    termsAcceptedAt: new Date(),
  });
  await sendVerificationMail(user);
  console.log(`[auth] registered user ${user.id} (${user.email}), verification mail sent`);
  return { dto: toUserDto(user), user };
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<{ dto: UserDto; user: User }> {
  const user = await users.findByEmail(input.email);
  const ok = user && (await bcrypt.compare(input.password, user.passwordHash));
  if (!user || !ok) {
    throw new ApiError(
      401,
      "INVALID_CREDENTIALS",
      "Email hoặc mật khẩu không đúng."
    );
  }
  return { dto: toUserDto(user), user };
}

/** Hồ sơ user hiện tại kèm trạng thái give-to-get. */
export async function getMe(user: User): Promise<MeDto> {
  const contributionCount = await users.countContributions(user.id);
  return {
    ...toUserDto(user),
    contributionCount,
    canViewPrices: contributionCount >= 1,
    emailVerified: user.emailVerifiedAt !== null,
    termsAccepted: user.termsAcceptedVersion === TERMS_VERSION,
  };
}

/** User bấm đồng ý bản điều khoản hiện hành (modal sau đăng nhập). */
export async function acceptTerms(user: User): Promise<void> {
  await users.acceptTerms(user.id, TERMS_VERSION);
  console.log(`[auth] ${user.id} accepted terms ${TERMS_VERSION}`);
}

/**
 * Xác nhận email bằng token trong link. Idempotent với token đã đốt: link bấm
 * lần 2, hoặc mail scanner (Gmail/Outlook) prefetch link trước khi user bấm,
 * vẫn trả thành công nếu user của token đã verify — không dọa "link hỏng".
 */
export async function verifyEmail(token: string): Promise<void> {
  const record = await tokens.findValidToken(token, "verify");
  if (!record) {
    const spent = await tokens.findTokenWithUser(token, "verify");
    if (spent?.user.emailVerifiedAt) {
      console.log(`[auth] verify token reused for already-verified ${spent.userId}`);
      return;
    }
    throw new ApiError(
      400,
      "INVALID_TOKEN",
      "Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng gửi lại email xác nhận."
    );
  }
  await tokens.markTokenUsed(record.id);
  await tokens.markEmailVerified(record.userId);
  console.log(`[auth] email verified for ${record.userId}`);
}

export async function resendVerification(user: User): Promise<void> {
  if (user.emailVerifiedAt) {
    throw new ApiError(409, "ALREADY_VERIFIED", "Email đã được xác nhận rồi.");
  }
  await sendVerificationMail(user);
}

/**
 * Quên mật khẩu: LUÔN im lặng thành công — không tiết lộ email nào tồn tại.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await users.findByEmail(email);
  if (!user) {
    console.log(`[auth] password reset requested for unknown email`);
    return;
  }
  const rawToken = await tokens.issueToken(user.id, "reset", RESET_TTL);
  await sendMail(
    user.email,
    "【DEAL】Đặt lại mật khẩu",
    `${user.displayName} thân mến,\n\n` +
      `Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu của bạn.\n` +
      `Đặt mật khẩu mới qua liên kết dưới đây (hiệu lực 1 giờ):\n\n` +
      `${appUrl()}/reset-password?token=${rawToken}\n\n` +
      `Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email. Mật khẩu sẽ không bị thay đổi.`
  );
}

/** Đặt mật khẩu mới + đăng xuất mọi thiết bị. */
export async function resetPassword(token: string, password: string): Promise<void> {
  const record = await tokens.findValidToken(token, "reset");
  if (!record) {
    throw new ApiError(
      400,
      "INVALID_TOKEN",
      "Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu lần nữa."
    );
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await tokens.markTokenUsed(record.id);
  await tokens.updatePassword(record.userId, passwordHash);
  await tokens.deleteAllSessions(record.userId);
  console.log(`[auth] password reset for ${record.userId}, all sessions revoked`);
}

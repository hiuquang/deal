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
  const token = await tokens.issueToken(user.id, "verify", VERIFY_TTL);
  await sendMail(
    user.email,
    "【DEAL】メールアドレスの確認",
    `${user.displayName} 様\n\n` +
      `DEALへのご登録ありがとうございます。\n` +
      `以下のリンクをクリックしてメールアドレスを確認してください（24時間有効）:\n\n` +
      `${appUrl()}/verify?token=${token.token}\n\n` +
      `心当たりがない場合はこのメールを無視してください。`
  );
}

export async function register(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<{ dto: UserDto; user: User }> {
  const existing = await users.findByEmail(input.email);
  if (existing) {
    throw new ApiError(409, "EMAIL_TAKEN", "このメールアドレスは既に登録されています。");
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
      "メールアドレスまたはパスワードが正しくありません。"
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

/** Xác nhận email bằng token trong link. */
export async function verifyEmail(token: string): Promise<void> {
  const record = await tokens.findValidToken(token, "verify");
  if (!record) {
    throw new ApiError(
      400,
      "INVALID_TOKEN",
      "リンクが無効か期限切れです。確認メールを再送してください。"
    );
  }
  await tokens.markTokenUsed(record.id);
  await tokens.markEmailVerified(record.userId);
  console.log(`[auth] email verified for ${record.userId}`);
}

export async function resendVerification(user: User): Promise<void> {
  if (user.emailVerifiedAt) {
    throw new ApiError(409, "ALREADY_VERIFIED", "既にメール確認済みです。");
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
  const token = await tokens.issueToken(user.id, "reset", RESET_TTL);
  await sendMail(
    user.email,
    "【DEAL】パスワード再設定",
    `${user.displayName} 様\n\n` +
      `パスワード再設定のリクエストを受け付けました。\n` +
      `以下のリンクから新しいパスワードを設定してください（1時間有効）:\n\n` +
      `${appUrl()}/reset-password?token=${token.token}\n\n` +
      `心当たりがない場合はこのメールを無視してください。パスワードは変更されません。`
  );
}

/** Đặt mật khẩu mới + đăng xuất mọi thiết bị. */
export async function resetPassword(token: string, password: string): Promise<void> {
  const record = await tokens.findValidToken(token, "reset");
  if (!record) {
    throw new ApiError(
      400,
      "INVALID_TOKEN",
      "リンクが無効か期限切れです。もう一度再設定をリクエストしてください。"
    );
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await tokens.markTokenUsed(record.id);
  await tokens.updatePassword(record.userId, passwordHash);
  await tokens.deleteAllSessions(record.userId);
  console.log(`[auth] password reset for ${record.userId}, all sessions revoked`);
}

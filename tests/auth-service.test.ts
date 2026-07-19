/**
 * Test auth-service — tập trung vào các thuộc tính bảo mật:
 * - không tiết lộ email nào tồn tại (quên mật khẩu im lặng thành công)
 * - token verify/reset sai/hết hạn → 400 INVALID_TOKEN
 * - reset mật khẩu phải thu hồi mọi phiên
 * - give-to-get gate + cờ emailVerified/termsAccepted trong getMe
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/server/errors";
import { expectApiError } from "./helpers";
import { TERMS_VERSION } from "@/lib/terms";

vi.mock("@/server/repositories/users", () => ({
  findByEmail: vi.fn(),
  createUser: vi.fn(),
  acceptTerms: vi.fn(),
  countContributions: vi.fn(),
}));
vi.mock("@/server/repositories/email-tokens", () => ({
  issueToken: vi.fn(),
  findValidToken: vi.fn(),
  markTokenUsed: vi.fn(),
  markEmailVerified: vi.fn(),
  updatePassword: vi.fn(),
  deleteAllSessions: vi.fn(),
}));
vi.mock("@/server/mailer", () => ({
  sendMail: vi.fn(),
  appUrl: () => "http://localhost:3000",
}));
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async () => "hashed"),
    compare: vi.fn(async (plain: string, hash: string) => hash === `hash:${plain}`),
  },
}));

import * as usersRepo from "@/server/repositories/users";
import * as tokensRepo from "@/server/repositories/email-tokens";
import * as mailer from "@/server/mailer";
import * as authService from "@/server/services/auth-service";

function makeUser(over: Record<string, unknown> = {}) {
  return {
    id: "u1",
    email: "a@example.com",
    passwordHash: "hash:secret123",
    displayName: "Taro",
    emailVerifiedAt: null,
    termsAcceptedVersion: TERMS_VERSION,
    termsAcceptedAt: new Date(),
    ...over,
  } as never;
}


beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(tokensRepo.issueToken).mockResolvedValue("tok123");
});

describe("authService.register", () => {
  it("409 EMAIL_TAKEN khi email đã tồn tại", async () => {
    vi.mocked(usersRepo.findByEmail).mockResolvedValue(makeUser());
    await expectApiError(
      authService.register({ email: "a@example.com", password: "secret123", displayName: "Taro" }),
      "EMAIL_TAKEN"
    );
  });

  it("tạo user + gửi mail xác nhận, ghi TERMS_VERSION hiện hành", async () => {
    vi.mocked(usersRepo.findByEmail).mockResolvedValue(null);
    vi.mocked(usersRepo.createUser).mockResolvedValue(makeUser());
    const { dto } = await authService.register({
      email: "a@example.com",
      password: "secret123",
      displayName: "Taro",
    });
    expect(dto.email).toBe("a@example.com");
    const createArg = vi.mocked(usersRepo.createUser).mock.calls[0][0];
    expect(createArg.termsAcceptedVersion).toBe(TERMS_VERSION);
    expect(createArg.passwordHash).toBe("hashed"); // không lưu plaintext
    expect(mailer.sendMail).toHaveBeenCalledOnce();
  });
});

describe("authService.login", () => {
  it("401 khi email không tồn tại", async () => {
    vi.mocked(usersRepo.findByEmail).mockResolvedValue(null);
    await expectApiError(
      authService.login({ email: "x@example.com", password: "secret123" }),
      "INVALID_CREDENTIALS"
    );
  });

  it("401 khi sai mật khẩu", async () => {
    vi.mocked(usersRepo.findByEmail).mockResolvedValue(makeUser());
    await expectApiError(
      authService.login({ email: "a@example.com", password: "wrongpass" }),
      "INVALID_CREDENTIALS"
    );
  });

  it("đúng mật khẩu → trả user dto", async () => {
    vi.mocked(usersRepo.findByEmail).mockResolvedValue(makeUser());
    const { dto } = await authService.login({ email: "a@example.com", password: "secret123" });
    expect(dto.id).toBe("u1");
  });
});

describe("authService.getMe — give-to-get gate", () => {
  it("chưa đóng góp → canViewPrices=false", async () => {
    vi.mocked(usersRepo.countContributions).mockResolvedValue(0);
    const me = await authService.getMe(makeUser());
    expect(me.canViewPrices).toBe(false);
    expect(me.contributionCount).toBe(0);
  });

  it("đã đóng góp ≥1 → canViewPrices=true", async () => {
    vi.mocked(usersRepo.countContributions).mockResolvedValue(1);
    const me = await authService.getMe(makeUser());
    expect(me.canViewPrices).toBe(true);
  });

  it("phản ánh emailVerified và termsAccepted", async () => {
    vi.mocked(usersRepo.countContributions).mockResolvedValue(0);
    const verified = await authService.getMe(
      makeUser({ emailVerifiedAt: new Date(), termsAcceptedVersion: "old" })
    );
    expect(verified.emailVerified).toBe(true);
    expect(verified.termsAccepted).toBe(false); // version cũ → phải re-accept
  });
});

describe("authService.verifyEmail", () => {
  it("400 INVALID_TOKEN khi token sai/hết hạn", async () => {
    vi.mocked(tokensRepo.findValidToken).mockResolvedValue(null);
    await expectApiError(authService.verifyEmail("bad"), "INVALID_TOKEN");
    expect(tokensRepo.markEmailVerified).not.toHaveBeenCalled();
  });

  it("token hợp lệ → đánh dấu used + verified", async () => {
    vi.mocked(tokensRepo.findValidToken).mockResolvedValue({ id: "t1", userId: "u1" } as never);
    await authService.verifyEmail("good");
    expect(tokensRepo.markTokenUsed).toHaveBeenCalledWith("t1");
    expect(tokensRepo.markEmailVerified).toHaveBeenCalledWith("u1");
  });
});

describe("authService.resendVerification", () => {
  it("409 ALREADY_VERIFIED khi đã xác nhận", async () => {
    await expectApiError(
      authService.resendVerification(makeUser({ emailVerifiedAt: new Date() })),
      "ALREADY_VERIFIED"
    );
    expect(mailer.sendMail).not.toHaveBeenCalled();
  });

  it("chưa xác nhận → gửi lại mail", async () => {
    await authService.resendVerification(makeUser());
    expect(mailer.sendMail).toHaveBeenCalledOnce();
  });
});

describe("authService.requestPasswordReset — không lộ email tồn tại", () => {
  it("email không tồn tại → im lặng thành công, không gửi mail", async () => {
    vi.mocked(usersRepo.findByEmail).mockResolvedValue(null);
    await expect(authService.requestPasswordReset("x@example.com")).resolves.toBeUndefined();
    expect(mailer.sendMail).not.toHaveBeenCalled();
  });

  it("email tồn tại → gửi mail reset", async () => {
    vi.mocked(usersRepo.findByEmail).mockResolvedValue(makeUser());
    await authService.requestPasswordReset("a@example.com");
    expect(mailer.sendMail).toHaveBeenCalledOnce();
  });
});

describe("authService.resetPassword", () => {
  it("400 INVALID_TOKEN khi token sai/hết hạn", async () => {
    vi.mocked(tokensRepo.findValidToken).mockResolvedValue(null);
    await expectApiError(authService.resetPassword("bad", "newpass123"), "INVALID_TOKEN");
    expect(tokensRepo.updatePassword).not.toHaveBeenCalled();
  });

  it("token hợp lệ → đổi mật khẩu (hash) + thu hồi mọi phiên", async () => {
    vi.mocked(tokensRepo.findValidToken).mockResolvedValue({ id: "t1", userId: "u1" } as never);
    await authService.resetPassword("good", "newpass123");
    expect(tokensRepo.markTokenUsed).toHaveBeenCalledWith("t1");
    expect(tokensRepo.updatePassword).toHaveBeenCalledWith("u1", "hashed");
    expect(tokensRepo.deleteAllSessions).toHaveBeenCalledWith("u1");
  });
});

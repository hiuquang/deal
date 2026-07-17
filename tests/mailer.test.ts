/**
 * Test mailer — chuỗi dự phòng Brevo → Gmail SMTP → dev outbox:
 * chọn đúng đường theo env, fallback khi Brevo lỗi, ném lỗi khi hết đường.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const smtpSendMail = vi.fn();
vi.mock("nodemailer", () => ({
  default: { createTransport: vi.fn(() => ({ sendMail: smtpSendMail })) },
}));
vi.mock("@/server/db", () => ({
  prisma: { emailOutbox: { create: vi.fn() } },
}));

import { prisma } from "@/server/db";
import { isMailConfigured, sendMail } from "@/server/mailer";

const fetchMock = vi.fn();

function stubBrevo(on: boolean) {
  vi.stubEnv("BREVO_API_KEY", on ? "xkeysib-test" : "");
  vi.stubEnv("BREVO_FROM", on ? "from@example.com" : "");
}
function stubSmtp(on: boolean) {
  vi.stubEnv("SMTP_HOST", on ? "smtp.example.com" : "");
  vi.stubEnv("SMTP_USER", on ? "user@example.com" : "");
  vi.stubEnv("SMTP_PASS", on ? "secret" : "");
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue({ ok: true } as never);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("sendMail — chuỗi dự phòng", () => {
  it("Brevo cấu hình + OK → gửi qua Brevo, KHÔNG đụng SMTP", async () => {
    stubBrevo(true);
    stubSmtp(true);
    await sendMail("to@example.com", "件名", "本文");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    const payload = JSON.parse((init as RequestInit).body as string);
    expect(payload.to).toEqual([{ email: "to@example.com" }]);
    expect(payload.sender.email).toBe("from@example.com");
    expect(smtpSendMail).not.toHaveBeenCalled();
  });

  it("Brevo lỗi + có SMTP → fallback sang SMTP", async () => {
    stubBrevo(true);
    stubSmtp(true);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "daily limit reached",
    } as never);
    await sendMail("to@example.com", "件名", "本文");
    expect(smtpSendMail).toHaveBeenCalledOnce();
    expect(smtpSendMail.mock.calls[0][0]).toMatchObject({ to: "to@example.com" });
  });

  it("Brevo lỗi + KHÔNG có SMTP → ném lỗi cho caller", async () => {
    stubBrevo(true);
    stubSmtp(false);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "boom",
    } as never);
    await expect(sendMail("to@example.com", "件名", "本文")).rejects.toThrow("Brevo 500");
    expect(smtpSendMail).not.toHaveBeenCalled();
    expect(prisma.emailOutbox.create).not.toHaveBeenCalled();
  });

  it("không Brevo + có SMTP → gửi thẳng SMTP (hành vi cũ)", async () => {
    stubBrevo(false);
    stubSmtp(true);
    await sendMail("to@example.com", "件名", "本文");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(smtpSendMail).toHaveBeenCalledOnce();
  });

  it("không đường nào → ghi dev outbox", async () => {
    stubBrevo(false);
    stubSmtp(false);
    await sendMail("to@example.com", "件名", "本文");
    expect(prisma.emailOutbox.create).toHaveBeenCalledOnce();
    expect(smtpSendMail).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("thiếu BREVO_FROM → coi như Brevo chưa cấu hình (không gửi mù)", async () => {
    vi.stubEnv("BREVO_API_KEY", "xkeysib-test");
    vi.stubEnv("BREVO_FROM", "");
    stubSmtp(true);
    await sendMail("to@example.com", "件名", "本文");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(smtpSendMail).toHaveBeenCalledOnce();
  });
});

describe("isMailConfigured", () => {
  it("true khi có Brevo hoặc SMTP, false khi cả hai trống", () => {
    stubBrevo(false);
    stubSmtp(false);
    expect(isMailConfigured()).toBe(false);
    stubSmtp(true);
    expect(isMailConfigured()).toBe(true);
    stubSmtp(false);
    stubBrevo(true);
    expect(isMailConfigured()).toBe(true);
  });
});

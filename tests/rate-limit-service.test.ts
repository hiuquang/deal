/**
 * Test rate-limit-service — tập trung vào các thuộc tính bảo mật:
 * - đúng ngưỡng mới chặn (không chặn sớm 1 nhịp, không cho lố 1 nhịp)
 * - key gộp action + identifier, chuẩn hóa chữ thường (đổi hoa/thường không lách được)
 * - DB lỗi → FAIL-OPEN (không khóa cả app khi pooler Supabase nguội)
 * - thông báo 429 nói rõ còn bao nhiêu phút
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { expectApiError } from "./helpers";

vi.mock("@/server/repositories/rate-limits", () => ({
  hit: vi.fn(),
  peek: vi.fn(),
  reset: vi.fn(),
  sweepExpired: vi.fn(),
}));

import * as rateLimits from "@/server/repositories/rate-limits";
import {
  DAILY_REGISTRATION_LIMIT,
  LIMITS,
  assertDailyRegistrationOpen,
  clear,
  countRegistration,
  enforce,
} from "@/server/services/rate-limit-service";

const mocked = vi.mocked(rateLimits);

/** Bộ đếm giả trả về `count`, cửa sổ còn 10 phút. */
function countReturns(count: number) {
  mocked.hit.mockResolvedValue({
    count,
    resetAt: new Date(Date.now() + 10 * 60 * 1000),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocked.sweepExpired.mockResolvedValue(0);
  // Tắt dọn rác ngẫu nhiên để test tất định.
  vi.spyOn(Math, "random").mockReturnValue(0.99);
});

describe("enforce", () => {
  it("cho qua khi còn dưới ngưỡng", async () => {
    countReturns(LIMITS["login:email"].limit - 1);
    await expect(enforce("login:email", "a@b.c")).resolves.toBeUndefined();
  });

  it("cho qua ở đúng lần cuối cùng trong ngưỡng (không chặn sớm)", async () => {
    countReturns(LIMITS["login:email"].limit);
    await expect(enforce("login:email", "a@b.c")).resolves.toBeUndefined();
  });

  it("chặn 429 ngay khi vượt ngưỡng 1 nhịp", async () => {
    countReturns(LIMITS["login:email"].limit + 1);
    await expectApiError(enforce("login:email", "a@b.c"), "RATE_LIMITED", 429);
  });

  it("key gộp action + identifier và chuẩn hóa chữ thường", async () => {
    countReturns(1);
    await enforce("login:email", "AbC@Example.COM");
    expect(mocked.hit).toHaveBeenCalledWith(
      "login:email:abc@example.com",
      LIMITS["login:email"].windowMs
    );
  });

  it("hai action khác nhau đếm riêng (key không đụng nhau)", async () => {
    countReturns(1);
    await enforce("login:ip", "1.2.3.4");
    await enforce("register:ip", "1.2.3.4");
    const keys = mocked.hit.mock.calls.map((c) => c[0]);
    expect(new Set(keys).size).toBe(2);
  });

  it("DB lỗi → fail-open, không ném lỗi", async () => {
    mocked.hit.mockRejectedValue(new Error("pooler nguội"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(enforce("login:ip", "1.2.3.4")).resolves.toBeUndefined();
  });

  it("thông báo 429 kèm số phút còn lại", async () => {
    mocked.hit.mockResolvedValue({
      count: LIMITS["forgot:email"].limit + 1,
      resetAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    try {
      await enforce("forgot:email", "a@b.c");
      expect.fail("phải ném RATE_LIMITED");
    } catch (e) {
      expect((e as Error).message).toContain("5 phút");
    }
  });

  it("gửi email siết chặt hơn đăng nhập (mail thật tốn quota SMTP)", () => {
    expect(LIMITS["forgot:email"].limit).toBeLessThan(LIMITS["login:email"].limit);
  });
});

describe("trần đăng ký toàn cục theo ngày (500 tài khoản/ngày JST)", () => {
  it("dưới trần → cho đăng ký", async () => {
    mocked.peek.mockResolvedValue(DAILY_REGISTRATION_LIMIT - 1);
    await expect(assertDailyRegistrationOpen()).resolves.toBeUndefined();
  });

  it("chạm trần → 429 REGISTRATION_FULL (check KHÔNG cộng đếm)", async () => {
    mocked.peek.mockResolvedValue(DAILY_REGISTRATION_LIMIT);
    await expectApiError(assertDailyRegistrationOpen(), "REGISTRATION_FULL", 429);
    expect(mocked.hit).not.toHaveBeenCalled();
  });

  it("key theo ngày JST dạng register:daily:YYYY-MM-DD", async () => {
    mocked.peek.mockResolvedValue(0);
    await assertDailyRegistrationOpen();
    expect(mocked.peek).toHaveBeenCalledWith(
      expect.stringMatching(/^register:daily:\d{4}-\d{2}-\d{2}$/)
    );
  });

  it("DB lỗi khi check → fail-open (không khóa đăng ký cả app)", async () => {
    mocked.peek.mockRejectedValue(new Error("pooler nguội"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(assertDailyRegistrationOpen()).resolves.toBeUndefined();
  });

  it("countRegistration cộng đúng key ngày; lỗi DB không phá luồng đăng ký", async () => {
    mocked.hit.mockResolvedValue({ count: 1, resetAt: new Date() });
    await countRegistration();
    expect(mocked.hit).toHaveBeenCalledWith(
      expect.stringMatching(/^register:daily:\d{4}-\d{2}-\d{2}$/),
      48 * 60 * 60 * 1000
    );
    mocked.hit.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(countRegistration()).resolves.toBeUndefined();
  });
});

describe("clear", () => {
  it("xóa đúng key đã chuẩn hóa", async () => {
    mocked.reset.mockResolvedValue(undefined);
    await clear("login:email", "AbC@Example.COM");
    expect(mocked.reset).toHaveBeenCalledWith("login:email:abc@example.com");
  });

  it("lỗi khi xóa không làm hỏng luồng đăng nhập", async () => {
    mocked.reset.mockRejectedValue(new Error("db down"));
    await expect(clear("login:ip", "1.2.3.4")).resolves.toBeUndefined();
  });
});

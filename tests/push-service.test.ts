/**
 * Test push-service — thông báo đẩy (Web Push):
 * - gửi tới MỌI thiết bị của user, payload đúng dạng service worker mong đợi
 * - endpoint chết (404/410) → xóa bản ghi; lỗi tạm thời (5xx) → GIỮ lại
 * - thiếu khoá VAPID → tắt êm, không gọi nhà cung cấp push
 * - notify() không bao giờ ném lỗi ra ngoài (không được làm hỏng hành động chính)
 *
 * push-service đọc env lúc import (module-level const) nên mỗi nhóm test phải
 * resetModules + stubEnv rồi mới import động.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("web-push", () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: vi.fn() },
}));
vi.mock("@/server/repositories/push-subscriptions", () => ({
  listForUser: vi.fn(),
  removeDead: vi.fn(),
}));

import webpush from "web-push";
import * as pushRepo from "@/server/repositories/push-subscriptions";

const wp = vi.mocked(webpush);
const repo = vi.mocked(pushRepo);

const PUBLIC = "BDvoYHM3hjc8LhZz5bDkqu-nGmjZmElMsm8Z-TVo-SRrSvL5f8I02ZgMQnKNoUqhFLHRet9uLH1raYi";
const PRIVATE = "test-private-key";

const payload = { title: "Hieu", body: "chào bạn", url: "/chat?c=c1", tag: "chat-c1" };

const device = (endpoint: string) => ({
  id: `s-${endpoint}`,
  endpoint,
  p256dh: "key-p256",
  auth: "key-auth",
});

/** Import push-service với env đã cấu hình (hoặc không). */
async function loadService(configured: boolean) {
  vi.resetModules();
  vi.stubEnv("VAPID_PUBLIC_KEY", configured ? PUBLIC : "");
  vi.stubEnv("VAPID_PRIVATE_KEY", configured ? PRIVATE : "");
  vi.stubEnv("VAPID_SUBJECT", "mailto:test@example.com");
  return import("@/server/services/push-service");
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("sendToUser", () => {
  it("gửi tới TẤT CẢ thiết bị của user, payload JSON đúng dạng", async () => {
    const { sendToUser } = await loadService(true);
    repo.listForUser.mockResolvedValue([device("https://push.apple/1"), device("https://fcm/2")]);
    wp.sendNotification.mockResolvedValue({} as never);

    expect(await sendToUser("u1", payload)).toBe(2);
    expect(wp.sendNotification).toHaveBeenCalledTimes(2);

    const [subscription, bodyJson] = wp.sendNotification.mock.calls[0];
    expect(subscription).toEqual({
      endpoint: "https://push.apple/1",
      keys: { p256dh: "key-p256", auth: "key-auth" },
    });
    expect(JSON.parse(bodyJson as string)).toEqual(payload);
  });

  it("user chưa bật thiết bị nào → không gọi nhà cung cấp push", async () => {
    const { sendToUser } = await loadService(true);
    repo.listForUser.mockResolvedValue([]);

    expect(await sendToUser("u1", payload)).toBe(0);
    expect(wp.sendNotification).not.toHaveBeenCalled();
  });

  it("endpoint trả 410 (đã gỡ app) → xóa bản ghi chết", async () => {
    const { sendToUser } = await loadService(true);
    repo.listForUser.mockResolvedValue([device("https://push.apple/dead")]);
    wp.sendNotification.mockRejectedValue(Object.assign(new Error("gone"), { statusCode: 410 }));

    expect(await sendToUser("u1", payload)).toBe(0);
    expect(repo.removeDead).toHaveBeenCalledWith("https://push.apple/dead");
  });

  it("endpoint trả 404 → xóa bản ghi chết", async () => {
    const { sendToUser } = await loadService(true);
    repo.listForUser.mockResolvedValue([device("https://fcm/missing")]);
    wp.sendNotification.mockRejectedValue(Object.assign(new Error("nf"), { statusCode: 404 }));

    await sendToUser("u1", payload);
    expect(repo.removeDead).toHaveBeenCalledWith("https://fcm/missing");
  });

  it("lỗi tạm thời (500) → GIỮ bản ghi, chỉ bỏ qua lần gửi này", async () => {
    const { sendToUser } = await loadService(true);
    repo.listForUser.mockResolvedValue([device("https://fcm/flaky")]);
    wp.sendNotification.mockRejectedValue(Object.assign(new Error("boom"), { statusCode: 500 }));

    expect(await sendToUser("u1", payload)).toBe(0);
    expect(repo.removeDead).not.toHaveBeenCalled();
  });

  it("1 thiết bị chết không chặn thiết bị còn lại", async () => {
    const { sendToUser } = await loadService(true);
    repo.listForUser.mockResolvedValue([device("https://a/dead"), device("https://b/ok")]);
    wp.sendNotification
      .mockRejectedValueOnce(Object.assign(new Error("gone"), { statusCode: 410 }))
      .mockResolvedValueOnce({} as never);

    expect(await sendToUser("u1", payload)).toBe(1);
    expect(repo.removeDead).toHaveBeenCalledWith("https://a/dead");
  });

  it("thiếu khoá VAPID → tắt êm, không đụng DB lẫn nhà cung cấp push", async () => {
    const { sendToUser, isConfigured } = await loadService(false);

    expect(isConfigured()).toBe(false);
    expect(await sendToUser("u1", payload)).toBe(0);
    expect(repo.listForUser).not.toHaveBeenCalled();
    expect(wp.sendNotification).not.toHaveBeenCalled();
  });
});

describe("getPublicKey", () => {
  it("trả khoá khi đã cấu hình", async () => {
    const { getPublicKey } = await loadService(true);
    expect(getPublicKey()).toBe(PUBLIC);
  });

  it("trả null khi chưa cấu hình → UI ẩn nút bật thông báo", async () => {
    const { getPublicKey } = await loadService(false);
    expect(getPublicKey()).toBeNull();
  });
});

describe("notify", () => {
  it("lỗi khi gửi KHÔNG được ném ra ngoài (không làm hỏng hành động chính)", async () => {
    const { notify } = await loadService(true);
    repo.listForUser.mockRejectedValue(new Error("DB sập"));

    expect(() => notify("u1", () => payload)).not.toThrow();
    // Nhường 1 vòng microtask để promise fire-and-forget kịp reject và bị nuốt.
    await Promise.resolve();
    await Promise.resolve();
  });

  it("dựng payload lỗi (field lồng nhau thiếu) → nuốt lỗi, KHÔNG gửi gì", async () => {
    const { notify } = await loadService(true);
    repo.listForUser.mockResolvedValue([device("https://a/1")]);

    const broken = () => {
      const listing = {} as { card: { nameJa: string } };
      return { ...payload, body: listing.card.nameJa };
    };
    expect(() => notify("u1", broken)).not.toThrow();
    expect(repo.listForUser).not.toHaveBeenCalled();
  });
});

describe("preview", () => {
  it("giữ nguyên chuỗi ngắn", async () => {
    const { preview } = await loadService(true);
    expect(preview("chào bạn")).toBe("chào bạn");
  });

  it("gộp khoảng trắng thừa (xuống dòng trong chat làm vỡ dòng thông báo)", async () => {
    const { preview } = await loadService(true);
    expect(preview("chào\n\n  bạn  nhé")).toBe("chào bạn nhé");
  });

  it("cắt chuỗi dài kèm dấu …", async () => {
    const { preview } = await loadService(true);
    const out = preview("x".repeat(200));
    expect(out).toHaveLength(120);
    expect(out.endsWith("…")).toBe(true);
  });
});

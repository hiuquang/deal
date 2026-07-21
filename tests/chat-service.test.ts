/**
 * Test logic đếm tin chưa đọc cho huy hiệu nav.
 * Repository được mock để test thuần quy tắc đếm.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/repositories/conversations", () => ({
  listConversationsWithReadState: vi.fn(),
  countUnreadMessages: vi.fn(),
  listConversationsToPurge: vi.fn(),
  purgeMessages: vi.fn(),
}));

import * as conversationsRepo from "@/server/repositories/conversations";
import {
  __resetPurgeThrottle,
  getUnreadCount,
  purgeExpiredChats,
  purgeExpiredChatsThrottled,
} from "@/server/services/chat-service";

const ME = "me";

function convo(over: Record<string, unknown>) {
  return {
    id: "c1",
    buyerId: ME,
    buyerLastReadAt: null,
    sellerLastReadAt: null,
    listing: { sellerId: "seller" },
    ...over,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("getUnreadCount", () => {
  it("buyer vừa match, chưa đọc, 0 tin → tính 1 (thông báo match)", async () => {
    vi.mocked(conversationsRepo.listConversationsWithReadState).mockResolvedValue([
      convo({ buyerLastReadAt: null }),
    ] as never);
    vi.mocked(conversationsRepo.countUnreadMessages).mockResolvedValue(0);

    expect(await getUnreadCount(ME)).toBe(1);
  });

  it("buyer chưa đọc, có 3 tin của seller → tính 3", async () => {
    vi.mocked(conversationsRepo.listConversationsWithReadState).mockResolvedValue([
      convo({ buyerLastReadAt: null }),
    ] as never);
    vi.mocked(conversationsRepo.countUnreadMessages).mockResolvedValue(3);

    expect(await getUnreadCount(ME)).toBe(3);
  });

  it("đã đọc rồi (mốc khác null) và 0 tin mới → 0, KHÔNG cộng thêm 1", async () => {
    vi.mocked(conversationsRepo.listConversationsWithReadState).mockResolvedValue([
      convo({ buyerLastReadAt: new Date() }),
    ] as never);
    vi.mocked(conversationsRepo.countUnreadMessages).mockResolvedValue(0);

    expect(await getUnreadCount(ME)).toBe(0);
  });

  it("dùng mốc của đúng vai (seller đọc cột sellerLastReadAt)", async () => {
    const seen = new Date("2026-07-15T00:00:00Z");
    vi.mocked(conversationsRepo.listConversationsWithReadState).mockResolvedValue([
      convo({ buyerId: "someBuyer", listing: { sellerId: ME }, sellerLastReadAt: seen }),
    ] as never);
    vi.mocked(conversationsRepo.countUnreadMessages).mockResolvedValue(2);

    expect(await getUnreadCount(ME)).toBe(2);
    expect(conversationsRepo.countUnreadMessages).toHaveBeenCalledWith("c1", ME, seen);
  });

  it("cộng dồn nhiều hội thoại", async () => {
    vi.mocked(conversationsRepo.listConversationsWithReadState).mockResolvedValue([
      convo({ id: "a", buyerLastReadAt: new Date() }),
      convo({ id: "b", buyerLastReadAt: new Date() }),
    ] as never);
    vi.mocked(conversationsRepo.countUnreadMessages)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(5);

    expect(await getUnreadCount(ME)).toBe(7);
  });
});

describe("purgeExpiredChats — xóa nội dung chat tới hạn", () => {
  beforeEach(() => __resetPurgeThrottle());

  it("xóa messages cho từng hội thoại tới hạn", async () => {
    vi.mocked(conversationsRepo.listConversationsToPurge).mockResolvedValue([
      { id: "a" },
      { id: "b" },
    ] as never);
    vi.mocked(conversationsRepo.purgeMessages).mockResolvedValue(3);
    const n = await purgeExpiredChats();
    expect(n).toBe(2);
    expect(conversationsRepo.purgeMessages).toHaveBeenCalledWith("a");
    expect(conversationsRepo.purgeMessages).toHaveBeenCalledWith("b");
  });

  it("throttle: lần 2 ngay sau bị bỏ qua (không quét trùng)", async () => {
    vi.mocked(conversationsRepo.listConversationsToPurge).mockResolvedValue([] as never);
    await purgeExpiredChatsThrottled();
    await purgeExpiredChatsThrottled();
    expect(conversationsRepo.listConversationsToPurge).toHaveBeenCalledTimes(1);
  });
});

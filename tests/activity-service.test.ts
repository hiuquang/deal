/**
 * Test activity-service — thông báo "hoạt động trên tin của tôi":
 * - gộp 3 nguồn (comment / 購入希望 / chào bán), sort mới nhất trước
 * - isNew so với mốc activitySeenAt; chưa xem lần nào → tất cả đều mới
 * - newCount khớp số item isNew; countNew truyền đúng mốc xuống repo
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/repositories/activity", () => ({
  listCommentsOnMyListings: vi.fn(),
  listPendingRequestsForMyListings: vi.fn(),
  listPendingOffersForMyBuyOrders: vi.fn(),
  countNewActivity: vi.fn(),
  setActivitySeen: vi.fn(),
}));

import * as activityRepo from "@/server/repositories/activity";
import { countNew, getActivity, markSeen } from "@/server/services/activity-service";
import type { User } from "@prisma/client";

const mocked = vi.mocked(activityRepo);

const SEEN = new Date("2026-07-20T00:00:00Z");
const BEFORE_SEEN = new Date("2026-07-19T00:00:00Z");
const AFTER_SEEN = new Date("2026-07-21T00:00:00Z");

function user(activitySeenAt: Date | null): User {
  return { id: "me", activitySeenAt } as User;
}

const actor = { id: "u2", displayName: "Hanako", isVip: false };
const card = { nameJa: "リザードン" };

function comment(createdAt: Date) {
  return { body: "状態は？", createdAt, user: actor, listing: { id: "l1", card } };
}
function request(createdAt: Date) {
  return { createdAt, buyer: actor, listing: { id: "l1", card } };
}
function offer(createdAt: Date) {
  return { quantity: 5, createdAt, seller: actor, buyOrder: { id: "b1", card } };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocked.listCommentsOnMyListings.mockResolvedValue([] as never);
  mocked.listPendingRequestsForMyListings.mockResolvedValue([] as never);
  mocked.listPendingOffersForMyBuyOrders.mockResolvedValue([] as never);
});

describe("getActivity", () => {
  it("gộp 3 nguồn, sort mới nhất trước, map đúng kind/targetId", async () => {
    mocked.listCommentsOnMyListings.mockResolvedValue([comment(BEFORE_SEEN)] as never);
    mocked.listPendingRequestsForMyListings.mockResolvedValue([request(AFTER_SEEN)] as never);
    mocked.listPendingOffersForMyBuyOrders.mockResolvedValue([offer(SEEN)] as never);

    const { items } = await getActivity(user(null));
    expect(items.map((i) => i.kind)).toEqual(["request", "offer", "comment"]);
    expect(items[1]).toMatchObject({ targetId: "b1", quantity: 5 });
    expect(items[2]).toMatchObject({ targetId: "l1", body: "状態は？" });
  });

  it("isNew theo mốc đã xem: chỉ item SAU mốc là mới, newCount khớp", async () => {
    mocked.listCommentsOnMyListings.mockResolvedValue([
      comment(AFTER_SEEN),
      comment(BEFORE_SEEN),
    ] as never);

    const { items, newCount } = await getActivity(user(SEEN));
    expect(items.map((i) => i.isNew)).toEqual([true, false]);
    expect(newCount).toBe(1);
  });

  it("chưa xem lần nào (mốc null) → mọi item đều mới", async () => {
    mocked.listPendingRequestsForMyListings.mockResolvedValue([
      request(BEFORE_SEEN),
    ] as never);

    const { items, newCount } = await getActivity(user(null));
    expect(items[0].isNew).toBe(true);
    expect(newCount).toBe(1);
  });
});

describe("countNew / markSeen", () => {
  it("countNew truyền mốc thật xuống repo; mốc null → epoch (đếm tất cả)", async () => {
    mocked.countNewActivity.mockResolvedValue(3);
    expect(await countNew(user(SEEN))).toBe(3);
    expect(mocked.countNewActivity).toHaveBeenCalledWith("me", SEEN);

    await countNew(user(null));
    expect(mocked.countNewActivity).toHaveBeenLastCalledWith("me", new Date(0));
  });

  it("markSeen ghi mốc cho đúng user", async () => {
    mocked.setActivitySeen.mockResolvedValue({} as never);
    await markSeen("me");
    expect(mocked.setActivitySeen).toHaveBeenCalledWith("me");
  });
});

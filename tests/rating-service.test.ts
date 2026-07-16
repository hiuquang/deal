/**
 * Test rating blind-mutual: mỗi bên 1 lần, chỉ trade đã chốt,
 * rating đối phương ẩn cho đến khi cả 2 đã rate.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/server/errors";
import { expectApiError } from "./helpers";

vi.mock("@/server/repositories/trades", () => ({
  findTradeById: vi.fn(),
}));
vi.mock("@/server/repositories/ratings", () => ({
  findRatingsByTrade: vi.fn(),
  createRating: vi.fn(),
  listRevealedRatingsForUser: vi.fn(),
  findUserById: vi.fn(),
}));
vi.mock("@/server/repositories/users", () => ({
  countContributions: vi.fn(),
}));

import * as tradesRepo from "@/server/repositories/trades";
import * as ratingsRepo from "@/server/repositories/ratings";
import * as usersRepo from "@/server/repositories/users";
import * as ratingService from "@/server/services/rating-service";

const trade = {
  id: "t1",
  buyerId: "buyer1",
  sellerId: "seller1",
  status: "confirmed",
} as never;

function makeRating(raterId: string, score = 5) {
  return {
    id: `r-${raterId}`,
    tradeId: "t1",
    raterId,
    rateeId: raterId === "buyer1" ? "seller1" : "buyer1",
    score,
    comment: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}


beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(tradesRepo.findTradeById).mockResolvedValue(trade);
  vi.mocked(ratingsRepo.findRatingsByTrade).mockResolvedValue([]);
});

describe("ratingService.rate", () => {
  it("403 khi không phải thành viên trade", async () => {
    await expectApiError(ratingService.rate("stranger", "t1", { score: 5 }), "FORBIDDEN");
  });

  it("409 khi trade chưa chốt", async () => {
    vi.mocked(tradesRepo.findTradeById).mockResolvedValue({
      ...((trade as unknown) as Record<string, unknown>),
      status: "pending",
    } as never);
    await expectApiError(
      ratingService.rate("buyer1", "t1", { score: 5 }),
      "TRADE_NOT_CLOSED"
    );
  });

  it("409 khi đã rate rồi", async () => {
    vi.mocked(ratingsRepo.findRatingsByTrade).mockResolvedValue([
      makeRating("buyer1"),
    ] as never);
    await expectApiError(ratingService.rate("buyer1", "t1", { score: 4 }), "ALREADY_RATED");
  });

  it("ratee tự suy ra là đối phương", async () => {
    vi.mocked(ratingsRepo.createRating).mockResolvedValue(makeRating("buyer1", 4) as never);
    await ratingService.rate("buyer1", "t1", { score: 4, comment: "スムーズでした" });
    expect(ratingsRepo.createRating).toHaveBeenCalledWith(
      expect.objectContaining({ raterId: "buyer1", rateeId: "seller1", score: 4 })
    );
  });
});

describe("ratingService.getState — blind rule", () => {
  it("đối phương đã rate nhưng mình chưa → KHÔNG lộ rating của họ", async () => {
    vi.mocked(ratingsRepo.findRatingsByTrade).mockResolvedValue([
      makeRating("seller1", 1),
    ] as never);
    const state = await ratingService.getState("buyer1", "t1");
    expect(state.revealed).toBe(false);
    expect(state.counterpartRating).toBeNull();
    expect(state.myRating).toBeNull();
  });

  it("cả 2 đã rate → reveal cả hai", async () => {
    vi.mocked(ratingsRepo.findRatingsByTrade).mockResolvedValue([
      makeRating("buyer1", 5),
      makeRating("seller1", 2),
    ] as never);
    const state = await ratingService.getState("buyer1", "t1");
    expect(state.revealed).toBe(true);
    expect(state.myRating?.score).toBe(5);
    expect(state.counterpartRating?.score).toBe(2);
  });
});

describe("ratingService.getUserSummary", () => {
  it("★ trung bình chỉ tính từ rating đã reveal, làm tròn 1 chữ số", async () => {
    vi.mocked(ratingsRepo.findUserById).mockResolvedValue({
      id: "seller1",
      displayName: "Taro",
      createdAt: new Date("2026-01-01"),
      deletedAt: null,
    } as never);
    vi.mocked(ratingsRepo.listRevealedRatingsForUser).mockResolvedValue([
      makeRating("buyer1", 5),
      makeRating("buyer2", 4),
      makeRating("buyer3", 4),
    ] as never);
    vi.mocked(usersRepo.countContributions).mockResolvedValue(7);

    const summary = await ratingService.getUserSummary("seller1");
    expect(summary.ratingAvg).toBe(4.3); // 13/3 = 4.333 → 4.3
    expect(summary.ratingCount).toBe(3);
    expect(summary.contributionCount).toBe(7);
  });

  it("chưa có rating reveal → ratingAvg null", async () => {
    vi.mocked(ratingsRepo.findUserById).mockResolvedValue({
      id: "u1",
      displayName: "X",
      createdAt: new Date(),
      deletedAt: null,
    } as never);
    vi.mocked(ratingsRepo.listRevealedRatingsForUser).mockResolvedValue([] as never);
    vi.mocked(usersRepo.countContributions).mockResolvedValue(0);

    const summary = await ratingService.getUserSummary("u1");
    expect(summary.ratingAvg).toBeNull();
    expect(summary.ratingCount).toBe(0);
  });
});

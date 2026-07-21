/**
 * Test favorite-service — tin đã lưu (❤️):
 * - toggle theo kind (listing/buy_order), thêm phải check tin tồn tại, bỏ thì không
 * - listSaved đánh dấu available theo status (active=true, khác=false), mục mồ côi
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { expectApiError } from "./helpers";

vi.mock("@/server/repositories/favorites", () => ({
  addListing: vi.fn(),
  removeListing: vi.fn(),
  addBuyOrder: vi.fn(),
  removeBuyOrder: vi.fn(),
  listSavedIds: vi.fn(),
  listSaved: vi.fn(),
}));
vi.mock("@/server/repositories/listings", () => ({ findListingById: vi.fn() }));
vi.mock("@/server/repositories/buy-orders", () => ({ findBuyOrderById: vi.fn() }));

import * as favoritesRepo from "@/server/repositories/favorites";
import * as listingsRepo from "@/server/repositories/listings";
import * as buyOrdersRepo from "@/server/repositories/buy-orders";
import { listSaved, toggle } from "@/server/services/favorite-service";

const fav = vi.mocked(favoritesRepo);
const lst = vi.mocked(listingsRepo);
const bo = vi.mocked(buyOrdersRepo);

beforeEach(() => vi.clearAllMocks());

describe("toggle", () => {
  it("lưu listing tồn tại → gọi addListing", async () => {
    lst.findListingById.mockResolvedValue({ id: "l1" } as never);
    expect(await toggle("me", "listing", "l1", true)).toEqual({ favorited: true });
    expect(fav.addListing).toHaveBeenCalledWith("me", "l1");
  });

  it("lưu listing KHÔNG tồn tại → 404, không add", async () => {
    lst.findListingById.mockResolvedValue(null);
    await expectApiError(toggle("me", "listing", "x", true), "NOT_FOUND", 404);
    expect(fav.addListing).not.toHaveBeenCalled();
  });

  it("bỏ lưu → removeListing, KHÔNG cần check tồn tại (tin có thể đã xóa)", async () => {
    expect(await toggle("me", "listing", "l1", false)).toEqual({ favorited: false });
    expect(fav.removeListing).toHaveBeenCalledWith("me", "l1");
    expect(lst.findListingById).not.toHaveBeenCalled();
  });

  it("lưu buy-order tồn tại → addBuyOrder", async () => {
    bo.findBuyOrderById.mockResolvedValue({ id: "b1" } as never);
    await toggle("me", "buy_order", "b1", true);
    expect(fav.addBuyOrder).toHaveBeenCalledWith("me", "b1");
  });
});

describe("listSaved", () => {
  it("listing active → available true; đã đóng → false; buy-order active → true", async () => {
    fav.listSaved.mockResolvedValue([
      {
        createdAt: new Date(),
        listing: { id: "l1", imageUrl: "u", askingPriceJpy: 500, status: "active", card: { nameJa: "A" } },
        buyOrder: null,
      },
      {
        createdAt: new Date(),
        listing: { id: "l2", imageUrl: "u", askingPriceJpy: 500, status: "closed", card: { nameJa: "B" } },
        buyOrder: null,
      },
      {
        createdAt: new Date(),
        listing: null,
        buyOrder: { id: "b1", maxUnitPriceJpy: 300, status: "active", card: { nameJa: "C" } },
      },
    ] as never);

    const items = await listSaved("me");
    expect(items.map((i) => [i.kind, i.available, i.targetId])).toEqual([
      ["listing", true, "l1"],
      ["listing", false, "l2"],
      ["buy_order", true, "b1"],
    ]);
  });

  it("mục mồ côi (cả 2 FK null = tin đã xóa cứng) → available false, targetId null", async () => {
    fav.listSaved.mockResolvedValue([
      { createdAt: new Date(), listing: null, buyOrder: null, buyOrderId: null },
    ] as never);
    const items = await listSaved("me");
    expect(items[0]).toMatchObject({ available: false, targetId: null, kind: "listing" });
  });
});

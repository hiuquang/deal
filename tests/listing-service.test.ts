/**
 * Test listing-service — khớp condition với loại sản phẩm (box vs thẻ lẻ,
 * dữ liệu giá sẽ nhiễu nếu lệch), và các guard khi hủy tin đăng.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/server/errors";
import { expectApiError } from "./helpers";

vi.mock("@/server/repositories/cards", () => ({
  findCardById: vi.fn(),
}));
vi.mock("@/server/repositories/listings", () => ({
  findListingById: vi.fn(),
  createListing: vi.fn(),
  updateListingStatus: vi.fn(),
  updateListingAskingPrice: vi.fn(),
}));
vi.mock("@/server/repositories/trades", () => ({
  findPendingTradeByListing: vi.fn(),
}));

import * as cardsRepo from "@/server/repositories/cards";
import * as listingsRepo from "@/server/repositories/listings";
import * as tradesRepo from "@/server/repositories/trades";
import * as listingService from "@/server/services/listing-service";


const baseInput = {
  cardId: "card1",
  imageUrl: "/uploads/x.jpg",
  askingPriceJpy: 50000,
  quantity: 1,
  tradeType: "sell",
  note: null,
};

function makeListing(over: Record<string, unknown> = {}) {
  return {
    id: "l1",
    sellerId: "seller1",
    status: "active",
    cardId: "card1",
    condition: "RAW_NM",
    imageUrl: "/uploads/x.jpg",
    askingPriceJpy: 50000,
    quantity: 1,
    tradeType: "sell",
    station: null,
    note: null,
    createdAt: new Date("2026-07-16T00:00:00Z"),
    card: {
      id: "card1",
      game: "pokemon",
      category: "single",
      setCode: "SV1",
      cardNumber: "001",
      language: "JP",
      nameJa: "ピカチュウ",
      nameEn: "Pikachu",
      rarity: "RR",
    },
    seller: { id: "seller1", displayName: "Seller" },
    ...over,
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listingService.create", () => {
  it("404 CARD_NOT_FOUND khi thẻ không tồn tại", async () => {
    vi.mocked(cardsRepo.findCardById).mockResolvedValue(null);
    await expectApiError(
      listingService.create("seller1", { ...baseInput, condition: "RAW_NM" }),
      "CARD_NOT_FOUND"
    );
  });

  it("400 CONDITION_MISMATCH khi thẻ lẻ dùng condition của BOX", async () => {
    vi.mocked(cardsRepo.findCardById).mockResolvedValue({ id: "card1", category: "single" } as never);
    await expectApiError(
      listingService.create("seller1", { ...baseInput, condition: "BOX_SHRINK" }),
      "CONDITION_MISMATCH"
    );
  });

  it("400 CONDITION_MISMATCH khi BOX dùng condition của thẻ lẻ", async () => {
    vi.mocked(cardsRepo.findCardById).mockResolvedValue({ id: "card1", category: "box" } as never);
    await expectApiError(
      listingService.create("seller1", { ...baseInput, condition: "PSA10" }),
      "CONDITION_MISMATCH"
    );
  });

  it("condition khớp thẻ lẻ → tạo listing, station trim rỗng thành null", async () => {
    vi.mocked(cardsRepo.findCardById).mockResolvedValue({ id: "card1", category: "single" } as never);
    vi.mocked(listingsRepo.createListing).mockResolvedValue(makeListing());
    await listingService.create("seller1", { ...baseInput, condition: "RAW_NM", station: "   " });
    const arg = vi.mocked(listingsRepo.createListing).mock.calls[0][0];
    expect(arg.condition).toBe("RAW_NM");
    expect(arg.station).toBeNull();
  });

  it("giữ station đã trim khi có giá trị", async () => {
    vi.mocked(cardsRepo.findCardById).mockResolvedValue({ id: "card1", category: "single" } as never);
    vi.mocked(listingsRepo.createListing).mockResolvedValue(makeListing());
    await listingService.create("seller1", { ...baseInput, condition: "RAW_NM", station: " 渋谷 " });
    expect(vi.mocked(listingsRepo.createListing).mock.calls[0][0].station).toBe("渋谷");
  });
});

describe("listingService.cancel", () => {
  it("404 khi tin không tồn tại", async () => {
    vi.mocked(listingsRepo.findListingById).mockResolvedValue(null);
    await expectApiError(listingService.cancel("seller1", "nope"), "NOT_FOUND");
  });

  it("403 khi không phải chủ tin", async () => {
    vi.mocked(listingsRepo.findListingById).mockResolvedValue(makeListing());
    await expectApiError(listingService.cancel("stranger", "l1"), "FORBIDDEN");
  });

  it("409 IN_TRADE khi tin active nhưng đang có trade pending", async () => {
    // Tin giữ active suốt quá trình trade → guard dựa vào trade pending, không
    // còn dựa vào trạng thái in_trade.
    vi.mocked(listingsRepo.findListingById).mockResolvedValue(makeListing());
    vi.mocked(tradesRepo.findPendingTradeByListing).mockResolvedValue({ id: "t1" } as never);
    await expectApiError(listingService.cancel("seller1", "l1"), "IN_TRADE");
  });

  it("409 INVALID_STATUS khi tin đã kết thúc", async () => {
    vi.mocked(listingsRepo.findListingById).mockResolvedValue(makeListing({ status: "sold" }));
    await expectApiError(listingService.cancel("seller1", "l1"), "INVALID_STATUS");
  });

  it("chủ tin hủy tin active (không có trade pending) → cập nhật status cancelled", async () => {
    vi.mocked(listingsRepo.findListingById).mockResolvedValue(makeListing());
    vi.mocked(tradesRepo.findPendingTradeByListing).mockResolvedValue(null);
    vi.mocked(listingsRepo.updateListingStatus).mockResolvedValue(makeListing({ status: "cancelled" }));
    const dto = await listingService.cancel("seller1", "l1");
    expect(listingsRepo.updateListingStatus).toHaveBeenCalledWith("l1", "cancelled");
    expect(dto.status).toBe("cancelled");
  });
});

describe("listingService.markSold", () => {
  it("403 khi không phải chủ tin", async () => {
    vi.mocked(listingsRepo.findListingById).mockResolvedValue(makeListing());
    await expectApiError(listingService.markSold("stranger", "l1"), "FORBIDDEN");
  });

  it("409 IN_TRADE khi đang có trade pending", async () => {
    vi.mocked(listingsRepo.findListingById).mockResolvedValue(makeListing());
    vi.mocked(tradesRepo.findPendingTradeByListing).mockResolvedValue({ id: "t1" } as never);
    await expectApiError(listingService.markSold("seller1", "l1"), "IN_TRADE");
  });

  it("409 INVALID_STATUS khi tin đã kết thúc", async () => {
    vi.mocked(listingsRepo.findListingById).mockResolvedValue(makeListing({ status: "closed" }));
    await expectApiError(listingService.markSold("seller1", "l1"), "INVALID_STATUS");
  });

  it("chủ tin đánh dấu đã bán tin active → cập nhật status closed", async () => {
    vi.mocked(listingsRepo.findListingById).mockResolvedValue(makeListing());
    vi.mocked(tradesRepo.findPendingTradeByListing).mockResolvedValue(null);
    vi.mocked(listingsRepo.updateListingStatus).mockResolvedValue(makeListing({ status: "closed" }));
    const dto = await listingService.markSold("seller1", "l1");
    expect(listingsRepo.updateListingStatus).toHaveBeenCalledWith("l1", "closed");
    expect(dto.status).toBe("closed");
  });
});

describe("listingService.updatePrice", () => {
  it("404 khi tin không tồn tại", async () => {
    vi.mocked(listingsRepo.findListingById).mockResolvedValue(null);
    await expectApiError(listingService.updatePrice("seller1", "nope", 9000), "NOT_FOUND");
  });

  it("403 khi không phải chủ tin", async () => {
    vi.mocked(listingsRepo.findListingById).mockResolvedValue(makeListing());
    await expectApiError(listingService.updatePrice("stranger", "l1", 9000), "FORBIDDEN");
  });

  it("409 INVALID_STATUS khi tin không còn active (đã đóng)", async () => {
    vi.mocked(listingsRepo.findListingById).mockResolvedValue(makeListing({ status: "closed" }));
    await expectApiError(listingService.updatePrice("seller1", "l1", 9000), "INVALID_STATUS");
  });

  it("chủ tin đổi giá tin active → gọi repo với giá mới", async () => {
    vi.mocked(listingsRepo.findListingById).mockResolvedValue(makeListing());
    vi.mocked(listingsRepo.updateListingAskingPrice).mockResolvedValue(
      makeListing({ askingPriceJpy: 12000 })
    );
    const dto = await listingService.updatePrice("seller1", "l1", 12000);
    expect(listingsRepo.updateListingAskingPrice).toHaveBeenCalledWith("l1", 12000);
    expect(dto.askingPriceJpy).toBe(12000);
  });

  it("đặt giá null → chuyển về 要相談", async () => {
    vi.mocked(listingsRepo.findListingById).mockResolvedValue(makeListing());
    vi.mocked(listingsRepo.updateListingAskingPrice).mockResolvedValue(
      makeListing({ askingPriceJpy: null })
    );
    const dto = await listingService.updatePrice("seller1", "l1", null);
    expect(listingsRepo.updateListingAskingPrice).toHaveBeenCalledWith("l1", null);
    expect(dto.askingPriceJpy).toBeNull();
  });
});

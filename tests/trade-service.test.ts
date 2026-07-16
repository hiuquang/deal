/**
 * Test luồng xác nhận giao dịch — trái tim của việc thu thập dữ liệu giá.
 * Repository và chat-service được mock để test thuần business rules.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { ApiError } from "@/server/errors";

vi.mock("@/server/repositories/trades", () => ({
  findTradeById: vi.fn(),
  findActiveTradeByListing: vi.fn(),
  findActiveTradeByConversation: vi.fn(),
  createTradeWithListingLock: vi.fn(),
  createBuyOrderTrade: vi.fn(),
  closeTrade: vi.fn(),
  cancelTradeWithListingUnlock: vi.fn(),
  cancelTrade: vi.fn(),
  listTradesForUser: vi.fn(),
  listExpiredPendingTrades: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/server/services/chat-service", () => ({
  getMembership: vi.fn(),
}));
vi.mock("@/server/services/outlier", () => ({
  computeFlagForTrade: vi.fn().mockResolvedValue(false),
}));

import * as tradesRepo from "@/server/repositories/trades";
import { getMembership } from "@/server/services/chat-service";
import * as tradeService from "@/server/services/trade-service";

const card = {
  id: "card1",
  game: "pokemon",
  category: "single",
  setCode: "sv4a",
  cardNumber: "205/190",
  language: "JP",
  nameJa: "リザードンex",
  nameEn: "Charizard ex",
  rarity: "SAR",
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeTrade(overrides: Record<string, unknown> = {}) {
  return {
    id: "t1",
    listingId: "l1",
    buyOrderId: null,
    conversationId: "cv1",
    sellerId: "seller1",
    buyerId: "buyer1",
    initiatorId: "seller1",
    cardId: "card1",
    condition: "PSA10",
    quantity: 1,
    card,
    finalPriceJpy: 50000,
    status: "pending",
    autoCloseAt: new Date(Date.now() + 86400000),
    confirmedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    listing: {
      id: "l1",
      sellerId: "seller1",
      cardId: "card1",
      condition: "PSA10",
      imageUrl: "/uploads/x.jpg",
      askingPriceJpy: 52000,
      tradeType: "sell",
      note: null,
      status: "in_trade",
      createdAt: new Date(),
      updatedAt: new Date(),
      card,
      seller: { id: "seller1", displayName: "Seller" },
    },
    buyer: { id: "buyer1", displayName: "Buyer" },
    seller: { id: "seller1", displayName: "Seller" },
    ...overrides,
  };
}

async function expectApiError(promise: Promise<unknown>, code: string, status: number) {
  try {
    await promise;
    expect.fail(`expected ApiError ${code}`);
  } catch (e) {
    expect(e).toBeInstanceOf(ApiError);
    expect((e as ApiError).code).toBe(code);
    expect((e as ApiError).status).toBe(status);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(tradesRepo.listExpiredPendingTrades).mockResolvedValue([]);
});

describe("tradeService.confirm", () => {
  it("404 khi trade không tồn tại", async () => {
    vi.mocked(tradesRepo.findTradeById).mockResolvedValue(null);
    await expectApiError(tradeService.confirm("buyer1", "nope", 50000), "NOT_FOUND", 404);
  });

  it("403 khi user không phải thành viên trade", async () => {
    vi.mocked(tradesRepo.findTradeById).mockResolvedValue(makeTrade() as never);
    await expectApiError(tradeService.confirm("stranger", "t1", 50000), "FORBIDDEN", 403);
  });

  it("409 khi trade đã chốt rồi", async () => {
    vi.mocked(tradesRepo.findTradeById).mockResolvedValue(
      makeTrade({ status: "confirmed" }) as never
    );
    await expectApiError(
      tradeService.confirm("buyer1", "t1", 50000),
      "ALREADY_CONFIRMED",
      409
    );
  });

  it("409 khi chính người khởi tạo tự confirm lần nữa", async () => {
    vi.mocked(tradesRepo.findTradeById).mockResolvedValue(makeTrade() as never);
    await expectApiError(
      tradeService.confirm("seller1", "t1", 50000),
      "WAITING_COUNTERPART",
      409
    );
  });

  it("409 PRICE_MISMATCH khi 2 bên khai giá khác nhau — chống khai láo giá", async () => {
    vi.mocked(tradesRepo.findTradeById).mockResolvedValue(makeTrade() as never);
    await expectApiError(
      tradeService.confirm("buyer1", "t1", 49000),
      "PRICE_MISMATCH",
      409
    );
    expect(tradesRepo.closeTrade).not.toHaveBeenCalled();
  });

  it("giá khớp → chốt confirmed và tạo đúng 1 price_record", async () => {
    const trade = makeTrade();
    vi.mocked(tradesRepo.findTradeById).mockResolvedValue(trade as never);
    vi.mocked(tradesRepo.closeTrade).mockResolvedValue(
      makeTrade({ status: "confirmed", confirmedAt: new Date() }) as never
    );

    const result = await tradeService.confirm("buyer1", "t1", 50000);

    expect(tradesRepo.closeTrade).toHaveBeenCalledTimes(1);
    expect(tradesRepo.closeTrade).toHaveBeenCalledWith(
      "t1",
      "confirmed",
      expect.objectContaining({ cardId: "card1", condition: "PSA10", priceJpy: 50000 })
    );
    expect(result.status).toBe("confirmed");
  });
});

describe("tradeService.create", () => {
  const conversation = {
    id: "cv1",
    listingId: "l1",
    buyOrderId: null,
    buyerId: "buyer1",
    sellerId: "seller1",
    createdAt: new Date(),
    updatedAt: new Date(),
    listing: makeTrade().listing,
    buyOrder: null,
    buyer: { id: "buyer1", displayName: "Buyer" },
  };

  it("409 TRADE_EXISTS khi listing đã có trade chưa cancelled", async () => {
    vi.mocked(getMembership).mockResolvedValue(conversation as never);
    vi.mocked(tradesRepo.findActiveTradeByListing).mockResolvedValue(makeTrade() as never);
    await expectApiError(
      tradeService.create("buyer1", { conversationId: "cv1", finalPriceJpy: 50000 }),
      "TRADE_EXISTS",
      409
    );
  });

  it("409 TRADE_EXISTS khi DB chặn race condition (2 request lọt qua check cùng lúc)", async () => {
    // findActiveTradeByListing trả null (chưa thấy trade nào) nhưng insert vẫn
    // vi phạm partial unique index DB (trades_one_active_per_listing) vì 1
    // request khác vừa insert trước — đúng kịch bản race giữa check và insert.
    vi.mocked(getMembership).mockResolvedValue(conversation as never);
    vi.mocked(tradesRepo.findActiveTradeByListing).mockResolvedValue(null);
    vi.mocked(tradesRepo.createTradeWithListingLock).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      })
    );

    await expectApiError(
      tradeService.create("buyer1", { conversationId: "cv1", finalPriceJpy: 50000 }),
      "TRADE_EXISTS",
      409
    );
  });

  it("tạo trade pending với buyer/seller suy ra từ conversation", async () => {
    vi.mocked(getMembership).mockResolvedValue(conversation as never);
    vi.mocked(tradesRepo.findActiveTradeByListing).mockResolvedValue(null);
    vi.mocked(tradesRepo.createTradeWithListingLock).mockResolvedValue(makeTrade() as never);

    await tradeService.create("buyer1", { conversationId: "cv1", finalPriceJpy: 50000 });

    expect(tradesRepo.createTradeWithListingLock).toHaveBeenCalledWith(
      expect.objectContaining({
        listingId: "l1",
        sellerId: "seller1",
        buyerId: "buyer1",
        initiatorId: "buyer1",
        finalPriceJpy: 50000,
      })
    );
  });
});

describe("tradeService.cancel", () => {
  it("409 khi trade không còn pending", async () => {
    vi.mocked(tradesRepo.findTradeById).mockResolvedValue(
      makeTrade({ status: "confirmed" }) as never
    );
    await expectApiError(tradeService.cancel("buyer1", "t1"), "INVALID_STATUS", 409);
  });
});

describe("tradeService.autoCloseExpiredThrottled", () => {
  it("chỉ quét DB 1 lần trong khoảng throttle — các lần gọi sau bỏ qua", async () => {
    tradeService.__resetAutoCloseThrottle();
    vi.mocked(tradesRepo.listExpiredPendingTrades).mockResolvedValue([]);

    await tradeService.autoCloseExpiredThrottled();
    await tradeService.autoCloseExpiredThrottled();
    await tradeService.autoCloseExpiredThrottled();

    expect(tradesRepo.listExpiredPendingTrades).toHaveBeenCalledTimes(1);
  });
});

describe("tradeService.autoCloseExpired", () => {
  it("chốt self_reported cho trade quá hạn, giữ nguyên giá và card/condition", async () => {
    const expired = makeTrade();
    vi.mocked(tradesRepo.listExpiredPendingTrades).mockResolvedValue([expired] as never);
    vi.mocked(tradesRepo.closeTrade).mockResolvedValue(
      makeTrade({ status: "self_reported" }) as never
    );

    const count = await tradeService.autoCloseExpired();

    expect(count).toBe(1);
    expect(tradesRepo.closeTrade).toHaveBeenCalledWith(
      "t1",
      "self_reported",
      expect.objectContaining({ priceJpy: 50000, cardId: "card1" })
    );
  });

  it("trade buy-order quá hạn: price_record dùng card/condition denormalize trên trade", async () => {
    // Trade từ tin gom không có listing — nguồn duy nhất là cột trên trades.
    const expired = makeTrade({
      listingId: null,
      listing: null,
      buyOrderId: "bo1",
      condition: "RAW_NM",
      quantity: 8,
      finalPriceJpy: 75000, // đơn giá
    });
    vi.mocked(tradesRepo.listExpiredPendingTrades).mockResolvedValue([expired] as never);
    vi.mocked(tradesRepo.closeTrade).mockResolvedValue(
      makeTrade({ status: "self_reported", listingId: null, listing: null, buyOrderId: "bo1" }) as never
    );

    await tradeService.autoCloseExpired();

    expect(tradesRepo.closeTrade).toHaveBeenCalledWith(
      "t1",
      "self_reported",
      expect.objectContaining({ cardId: "card1", condition: "RAW_NM", priceJpy: 75000 })
    );
  });
});

// ---- Trade từ tin gom số lượng lớn (P9) ----

describe("tradeService.create — buy-order", () => {
  const boConversation = {
    id: "cv9",
    listingId: null,
    buyOrderId: "bo1",
    buyerId: "buyer1",
    sellerId: "seller1",
    createdAt: new Date(),
    updatedAt: new Date(),
    listing: null,
    buyOrder: {
      id: "bo1",
      buyerId: "buyer1",
      cardId: "card1",
      quantity: 20,
      maxUnitPriceJpy: 80000,
      status: "active",
      card,
    },
    buyer: { id: "buyer1", displayName: "Buyer" },
  };
  const boInput = {
    conversationId: "cv9",
    finalPriceJpy: 75000, // đơn giá
    condition: "RAW_NM",
    quantity: 8,
  };

  beforeEach(() => {
    vi.mocked(getMembership).mockResolvedValue(boConversation as never);
    vi.mocked(tradesRepo.findActiveTradeByConversation).mockResolvedValue(null);
  });

  it("409 NOT_ACTIVE khi tin gom đã đóng", async () => {
    vi.mocked(getMembership).mockResolvedValue({
      ...boConversation,
      buyOrder: { ...boConversation.buyOrder, status: "cancelled" },
    } as never);
    await expectApiError(tradeService.create("seller1", boInput), "NOT_ACTIVE", 409);
  });

  it("400 VALIDATION khi thiếu condition/quantity", async () => {
    await expectApiError(
      tradeService.create("seller1", { conversationId: "cv9", finalPriceJpy: 75000 }),
      "VALIDATION",
      400
    );
  });

  it("400 CONDITION_MISMATCH khi condition lệch loại sản phẩm (thẻ lẻ dùng condition BOX)", async () => {
    await expectApiError(
      tradeService.create("seller1", { ...boInput, condition: "BOX_SHRINK" }),
      "CONDITION_MISMATCH",
      400
    );
  });

  it("409 TRADE_EXISTS khi hội thoại đã có trade chưa cancelled", async () => {
    vi.mocked(tradesRepo.findActiveTradeByConversation).mockResolvedValue(makeTrade() as never);
    await expectApiError(tradeService.create("seller1", boInput), "TRADE_EXISTS", 409);
  });

  it("409 TRADE_EXISTS khi DB chặn race (P2002 từ trades_one_active_per_conversation)", async () => {
    vi.mocked(tradesRepo.createBuyOrderTrade).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      })
    );
    await expectApiError(tradeService.create("seller1", boInput), "TRADE_EXISTS", 409);
  });

  it("hợp lệ → tạo trade với đơn giá + quantity + condition, KHÔNG khóa listing", async () => {
    vi.mocked(tradesRepo.createBuyOrderTrade).mockResolvedValue(
      makeTrade({
        listingId: null,
        listing: null,
        buyOrderId: "bo1",
        condition: "RAW_NM",
        quantity: 8,
        finalPriceJpy: 75000,
        initiatorId: "seller1",
      }) as never
    );

    const dto = await tradeService.create("seller1", boInput);

    expect(tradesRepo.createBuyOrderTrade).toHaveBeenCalledWith(
      expect.objectContaining({
        buyOrderId: "bo1",
        sellerId: "seller1",
        buyerId: "buyer1",
        cardId: "card1",
        condition: "RAW_NM",
        quantity: 8,
        finalPriceJpy: 75000,
      })
    );
    expect(tradesRepo.createTradeWithListingLock).not.toHaveBeenCalled();
    expect(dto.kind).toBe("buy_order");
  });
});

describe("tradeService.confirm — buy-order (khớp cả đơn giá lẫn số lượng)", () => {
  function makeBoTrade(over: Record<string, unknown> = {}) {
    return makeTrade({
      listingId: null,
      listing: null,
      buyOrderId: "bo1",
      condition: "RAW_NM",
      quantity: 8,
      finalPriceJpy: 75000,
      initiatorId: "seller1",
      ...over,
    });
  }

  it("409 QUANTITY_MISMATCH khi số lượng lệch — chống khai láo số lượng", async () => {
    vi.mocked(tradesRepo.findTradeById).mockResolvedValue(makeBoTrade() as never);
    await expectApiError(
      tradeService.confirm("buyer1", "t1", 75000, 5),
      "QUANTITY_MISMATCH",
      409
    );
    expect(tradesRepo.closeTrade).not.toHaveBeenCalled();
  });

  it("409 PRICE_MISMATCH khi đơn giá lệch", async () => {
    vi.mocked(tradesRepo.findTradeById).mockResolvedValue(makeBoTrade() as never);
    await expectApiError(
      tradeService.confirm("buyer1", "t1", 70000, 8),
      "PRICE_MISMATCH",
      409
    );
  });

  it("khớp cả hai → chốt, price_record ghi ĐƠN GIÁ với condition đã khai", async () => {
    vi.mocked(tradesRepo.findTradeById).mockResolvedValue(makeBoTrade() as never);
    vi.mocked(tradesRepo.closeTrade).mockResolvedValue(
      makeBoTrade({ status: "confirmed", confirmedAt: new Date() }) as never
    );

    const dto = await tradeService.confirm("buyer1", "t1", 75000, 8);

    expect(tradesRepo.closeTrade).toHaveBeenCalledWith(
      "t1",
      "confirmed",
      expect.objectContaining({ cardId: "card1", condition: "RAW_NM", priceJpy: 75000 })
    );
    expect(dto.status).toBe("confirmed");
  });
});

describe("tradeService.cancel — buy-order", () => {
  it("hủy trade buy-order → không đụng listing (cancelTrade thuần)", async () => {
    const boTrade = makeTrade({ listingId: null, listing: null, buyOrderId: "bo1" });
    vi.mocked(tradesRepo.findTradeById).mockResolvedValue(boTrade as never);
    vi.mocked(tradesRepo.cancelTrade).mockResolvedValue(
      makeTrade({ listingId: null, listing: null, buyOrderId: "bo1", status: "cancelled" }) as never
    );

    const dto = await tradeService.cancel("buyer1", "t1");

    expect(tradesRepo.cancelTrade).toHaveBeenCalledWith("t1");
    expect(tradesRepo.cancelTradeWithListingUnlock).not.toHaveBeenCalled();
    expect(dto.status).toBe("cancelled");
  });
});

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
  createTradeWithListingLock: vi.fn(),
  closeTrade: vi.fn(),
  cancelTradeWithListingUnlock: vi.fn(),
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
    conversationId: "cv1",
    sellerId: "seller1",
    buyerId: "buyer1",
    initiatorId: "seller1",
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
    buyerId: "buyer1",
    createdAt: new Date(),
    updatedAt: new Date(),
    listing: makeTrade().listing,
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
});

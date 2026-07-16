/**
 * Test buy-order-service — tin gom số lượng lớn: guard tạo tin + hủy tin.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/server/errors";
import { expectApiError } from "./helpers";

vi.mock("@/server/repositories/cards", () => ({
  findCardById: vi.fn(),
}));
vi.mock("@/server/repositories/buy-orders", () => ({
  listBuyOrders: vi.fn(),
  findBuyOrderById: vi.fn(),
  createBuyOrder: vi.fn(),
  updateBuyOrderStatus: vi.fn(),
}));

import * as cardsRepo from "@/server/repositories/cards";
import * as buyOrdersRepo from "@/server/repositories/buy-orders";
import * as buyOrderService from "@/server/services/buy-order-service";


function makeOrder(over: Record<string, unknown> = {}) {
  return {
    id: "bo1",
    buyerId: "buyer1",
    cardId: "card1",
    quantity: 10,
    maxUnitPriceJpy: 5000,
    status: "active",
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
    buyer: { id: "buyer1", displayName: "Buyer" },
    _count: { offers: 0 },
    ...over,
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buyOrderService.create", () => {
  it("404 CARD_NOT_FOUND khi thẻ không tồn tại", async () => {
    vi.mocked(cardsRepo.findCardById).mockResolvedValue(null);
    await expectApiError(
      buyOrderService.create("buyer1", { cardId: "ghost", quantity: 10 }),
      "CARD_NOT_FOUND"
    );
  });

  it("thẻ tồn tại → tạo tin, maxUnitPriceJpy mặc định null", async () => {
    vi.mocked(cardsRepo.findCardById).mockResolvedValue({ id: "card1" } as never);
    vi.mocked(buyOrdersRepo.createBuyOrder).mockResolvedValue(makeOrder());
    await buyOrderService.create("buyer1", { cardId: "card1", quantity: 10 });
    expect(vi.mocked(buyOrdersRepo.createBuyOrder).mock.calls[0][0].maxUnitPriceJpy).toBeNull();
  });
});

describe("buyOrderService.cancel", () => {
  it("404 khi tin không tồn tại", async () => {
    vi.mocked(buyOrdersRepo.findBuyOrderById).mockResolvedValue(null);
    await expectApiError(buyOrderService.cancel("buyer1", "nope"), "NOT_FOUND");
  });

  it("403 khi không phải chủ tin", async () => {
    vi.mocked(buyOrdersRepo.findBuyOrderById).mockResolvedValue(makeOrder());
    await expectApiError(buyOrderService.cancel("stranger", "bo1"), "FORBIDDEN");
  });

  it("409 INVALID_STATUS khi tin đã hủy", async () => {
    vi.mocked(buyOrdersRepo.findBuyOrderById).mockResolvedValue(makeOrder({ status: "cancelled" }));
    await expectApiError(buyOrderService.cancel("buyer1", "bo1"), "INVALID_STATUS");
  });

  it("chủ tin hủy tin active → cập nhật cancelled", async () => {
    vi.mocked(buyOrdersRepo.findBuyOrderById).mockResolvedValue(makeOrder());
    vi.mocked(buyOrdersRepo.updateBuyOrderStatus).mockResolvedValue(makeOrder({ status: "cancelled" }));
    const dto = await buyOrderService.cancel("buyer1", "bo1");
    expect(buyOrdersRepo.updateBuyOrderStatus).toHaveBeenCalledWith("bo1", "cancelled");
    expect(dto.status).toBe("cancelled");
  });
});

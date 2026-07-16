/**
 * Test buy-order-offer-service — chào bán + kết nối sang chat riêng.
 * Conversation CHỈ sinh qua connect; chỉ chủ tin (người mua) được connect.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/server/errors";

vi.mock("@/server/repositories/buy-order-offers", () => ({
  findOfferById: vi.fn(),
  findOffer: vi.fn(),
  listOffersForOrder: vi.fn(),
  createOffer: vi.fn(),
  markConnected: vi.fn(),
}));
vi.mock("@/server/repositories/buy-orders", () => ({
  findBuyOrderById: vi.fn(),
}));
vi.mock("@/server/repositories/conversations", () => ({
  findOrCreateBuyOrderConversation: vi.fn(),
  findBuyOrderConversationByPair: vi.fn(),
}));
vi.mock("@/server/services/rating-service", () => ({
  getUserSummary: vi.fn().mockResolvedValue({
    id: "seller1",
    displayName: "Seller",
    ratingAvg: 4.2,
    ratingCount: 3,
    contributionCount: 5,
    memberSince: "2026-01-01T00:00:00.000Z",
  }),
}));

import * as offersRepo from "@/server/repositories/buy-order-offers";
import * as buyOrdersRepo from "@/server/repositories/buy-orders";
import * as conversationsRepo from "@/server/repositories/conversations";
import * as offerService from "@/server/services/buy-order-offer-service";

async function expectApiError(promise: Promise<unknown>, code: string) {
  try {
    await promise;
    expect.fail(`expected ApiError ${code}`);
  } catch (e) {
    expect(e).toBeInstanceOf(ApiError);
    expect((e as ApiError).code).toBe(code);
  }
}

const activeOrder = { id: "bo1", buyerId: "buyer1", status: "active" } as never;

function makeOffer(over: Record<string, unknown> = {}) {
  return {
    id: "of1",
    buyOrderId: "bo1",
    quantity: 5,
    message: null,
    status: "pending",
    createdAt: new Date(),
    seller: { id: "seller1", displayName: "Seller" },
    buyOrder: { id: "bo1", buyerId: "buyer1", status: "active" },
    ...over,
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(buyOrdersRepo.findBuyOrderById).mockResolvedValue(activeOrder);
  vi.mocked(offersRepo.findOffer).mockResolvedValue(null);
  vi.mocked(conversationsRepo.findBuyOrderConversationByPair).mockResolvedValue({ id: "cv1" } as never);
});

describe("offerService.create", () => {
  it("409 OWN_ORDER khi tự chào bán tin của mình", async () => {
    await expectApiError(offerService.create("buyer1", "bo1", { quantity: 5 }), "OWN_ORDER");
  });

  it("409 NOT_ACTIVE khi tin đã đóng", async () => {
    vi.mocked(buyOrdersRepo.findBuyOrderById).mockResolvedValue({
      id: "bo1",
      buyerId: "buyer1",
      status: "cancelled",
    } as never);
    await expectApiError(offerService.create("seller1", "bo1", { quantity: 5 }), "NOT_ACTIVE");
  });

  it("409 ALREADY_OFFERED khi đã chào bán rồi", async () => {
    vi.mocked(offersRepo.findOffer).mockResolvedValue(makeOffer());
    await expectApiError(offerService.create("seller1", "bo1", { quantity: 5 }), "ALREADY_OFFERED");
  });

  it("hợp lệ → tạo chào bán kèm uy tín người bán", async () => {
    vi.mocked(offersRepo.createOffer).mockResolvedValue(makeOffer());
    const dto = await offerService.create("seller1", "bo1", { quantity: 5, message: " hi " });
    expect(dto.quantity).toBe(5);
    expect(dto.sellerRatingAvg).toBe(4.2);
    expect(dto.conversationId).toBeNull(); // chưa connect
    expect(vi.mocked(offersRepo.createOffer).mock.calls[0][0].message).toBe("hi");
  });
});

describe("offerService.connect", () => {
  it("403 khi không phải chủ tin", async () => {
    vi.mocked(offersRepo.findOfferById).mockResolvedValue(makeOffer());
    await expectApiError(offerService.connect("stranger", "of1"), "FORBIDDEN");
  });

  it("chủ tin connect → tạo conversation + markConnected", async () => {
    vi.mocked(offersRepo.findOfferById).mockResolvedValue(makeOffer());
    vi.mocked(conversationsRepo.findOrCreateBuyOrderConversation).mockResolvedValue({ id: "cv1" } as never);
    vi.mocked(offersRepo.markConnected).mockResolvedValue(makeOffer({ status: "connected" }));

    const result = await offerService.connect("buyer1", "of1");

    expect(conversationsRepo.findOrCreateBuyOrderConversation).toHaveBeenCalledWith("bo1", "buyer1", "seller1");
    expect(offersRepo.markConnected).toHaveBeenCalledWith("of1");
    expect(result.conversationId).toBe("cv1");
    expect(result.offer.status).toBe("connected");
  });

  it("idempotent: đã connected thì không markConnected lại", async () => {
    vi.mocked(offersRepo.findOfferById).mockResolvedValue(makeOffer({ status: "connected" }));
    vi.mocked(conversationsRepo.findOrCreateBuyOrderConversation).mockResolvedValue({ id: "cv1" } as never);

    const result = await offerService.connect("buyer1", "of1");

    expect(offersRepo.markConnected).not.toHaveBeenCalled();
    expect(result.conversationId).toBe("cv1");
  });
});

/**
 * Test luồng mua: 購入希望 → seller 連携 → conversation riêng.
 * Conversation chỉ được sinh qua connect; seller toàn quyền chọn đối tác.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/server/errors";

vi.mock("@/server/repositories/listings", () => ({
  findListingById: vi.fn(),
}));
vi.mock("@/server/repositories/requests", () => ({
  findRequestById: vi.fn(),
  findRequest: vi.fn(),
  listRequestsForListing: vi.fn(),
  createRequest: vi.fn(),
  markConnected: vi.fn(),
}));
vi.mock("@/server/repositories/conversations", () => ({
  findOrCreateConversation: vi.fn(),
  findConversationByPair: vi.fn(),
}));
vi.mock("@/server/services/rating-service", () => ({
  getUserSummary: vi.fn().mockResolvedValue({
    id: "buyer1",
    displayName: "Buyer",
    ratingAvg: 4.5,
    ratingCount: 2,
    contributionCount: 3,
    memberSince: "2026-01-01T00:00:00.000Z",
  }),
}));

import * as listingsRepo from "@/server/repositories/listings";
import * as requestsRepo from "@/server/repositories/requests";
import * as conversationsRepo from "@/server/repositories/conversations";
import * as requestService from "@/server/services/request-service";

const listing = { id: "l1", sellerId: "seller1", status: "active" } as never;

function makeRequest(status = "pending") {
  return {
    id: "req1",
    listingId: "l1",
    buyerId: "buyer1",
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
    buyer: { id: "buyer1", displayName: "Buyer" },
    listing: { id: "l1", sellerId: "seller1", status: "active" },
  } as never;
}

async function expectApiError(promise: Promise<unknown>, code: string) {
  try {
    await promise;
    expect.fail(`expected ApiError ${code}`);
  } catch (e) {
    expect(e).toBeInstanceOf(ApiError);
    expect((e as ApiError).code).toBe(code);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listingsRepo.findListingById).mockResolvedValue(listing);
  vi.mocked(requestsRepo.findRequest).mockResolvedValue(null);
  vi.mocked(conversationsRepo.findConversationByPair).mockResolvedValue({
    id: "cv1",
  } as never);
});

describe("requestService.create", () => {
  it("seller không tự gửi 購入希望 cho listing của mình", async () => {
    await expectApiError(requestService.create("seller1", "l1"), "OWN_LISTING");
  });

  it("409 khi listing không còn active", async () => {
    vi.mocked(listingsRepo.findListingById).mockResolvedValue({
      id: "l1",
      sellerId: "seller1",
      status: "in_trade",
    } as never);
    await expectApiError(requestService.create("buyer1", "l1"), "NOT_ACTIVE");
  });

  it("409 khi đã gửi request rồi", async () => {
    vi.mocked(requestsRepo.findRequest).mockResolvedValue(makeRequest());
    await expectApiError(requestService.create("buyer1", "l1"), "ALREADY_REQUESTED");
  });

  it("tạo request pending kèm hồ sơ uy tín buyer", async () => {
    vi.mocked(requestsRepo.createRequest).mockResolvedValue(makeRequest());
    const dto = await requestService.create("buyer1", "l1");
    expect(dto.status).toBe("pending");
    expect(dto.buyerRatingAvg).toBe(4.5);
    expect(dto.conversationId).toBeNull(); // chưa connect → chưa có chat riêng
  });
});

describe("requestService.listForSeller", () => {
  it("403 khi người xem không phải seller", async () => {
    await expectApiError(requestService.listForSeller("buyer1", "l1"), "FORBIDDEN");
  });
});

describe("requestService.connect", () => {
  it("403 khi không phải seller của listing", async () => {
    vi.mocked(requestsRepo.findRequestById).mockResolvedValue(makeRequest());
    await expectApiError(requestService.connect("stranger", "req1"), "FORBIDDEN");
  });

  it("seller connect → tạo conversation + status connected", async () => {
    vi.mocked(requestsRepo.findRequestById).mockResolvedValue(makeRequest());
    vi.mocked(conversationsRepo.findOrCreateConversation).mockResolvedValue({
      id: "cv1",
    } as never);
    vi.mocked(requestsRepo.markConnected).mockResolvedValue(makeRequest("connected"));

    const result = await requestService.connect("seller1", "req1");

    expect(conversationsRepo.findOrCreateConversation).toHaveBeenCalledWith("l1", "buyer1");
    expect(requestsRepo.markConnected).toHaveBeenCalledWith("req1");
    expect(result.conversationId).toBe("cv1");
    expect(result.request.status).toBe("connected");
  });

  it("idempotent: đã connected thì không markConnected lại", async () => {
    vi.mocked(requestsRepo.findRequestById).mockResolvedValue(makeRequest("connected"));
    vi.mocked(conversationsRepo.findOrCreateConversation).mockResolvedValue({
      id: "cv1",
    } as never);

    const result = await requestService.connect("seller1", "req1");

    expect(requestsRepo.markConnected).not.toHaveBeenCalled();
    expect(result.conversationId).toBe("cv1");
  });
});

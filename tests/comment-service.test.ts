/**
 * Test comment-service — bình luận công khai trên tin BÁN và tin ĐĂNG MUA:
 * - 404 khi tin không tồn tại (đọc & viết), không ghi gì
 * - map DTO đúng, truyền đúng target xuống repo
 * - push báo CHỦ TIN; chủ tin đăng mua là buyerId (luồng đảo chiều), không phải seller
 * - tự bình luận vào tin mình → KHÔNG tự gửi thông báo cho chính mình
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { expectApiError } from "./helpers";

vi.mock("@/server/repositories/listings", () => ({ findListingById: vi.fn() }));
vi.mock("@/server/repositories/buy-orders", () => ({ findBuyOrderById: vi.fn() }));
vi.mock("@/server/repositories/comments", () => ({
  listComments: vi.fn(),
  createComment: vi.fn(),
}));
vi.mock("@/server/services/push-service", () => ({
  notify: vi.fn(),
  preview: (s: string) => s,
}));

import * as listingsRepo from "@/server/repositories/listings";
import * as buyOrdersRepo from "@/server/repositories/buy-orders";
import * as commentsRepo from "@/server/repositories/comments";
import * as pushService from "@/server/services/push-service";
import * as commentService from "@/server/services/comment-service";

const LISTING = { kind: "listing", id: "l1" } as const;
const BUY_ORDER = { kind: "buy_order", id: "b1" } as const;

function makeComment(over: Record<string, unknown> = {}) {
  return {
    id: "c1",
    listingId: "l1",
    buyOrderId: null,
    body: "còn hàng không bạn?",
    createdAt: new Date("2026-07-16T00:00:00Z"),
    user: { id: "u1", displayName: "Taro", isVip: false },
    ...over,
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listingsRepo.findListingById).mockResolvedValue({
    id: "l1",
    sellerId: "chu-tin-ban",
    card: { nameJa: "Thẻ A" },
  } as never);
  vi.mocked(buyOrdersRepo.findBuyOrderById).mockResolvedValue({
    id: "b1",
    buyerId: "chu-tin-mua",
    card: { nameJa: "Thẻ B" },
  } as never);
});

describe("list", () => {
  it("404 khi tin bán không tồn tại", async () => {
    vi.mocked(listingsRepo.findListingById).mockResolvedValue(null);
    await expectApiError(commentService.list(LISTING), "NOT_FOUND");
  });

  it("404 khi tin đăng mua không tồn tại", async () => {
    vi.mocked(buyOrdersRepo.findBuyOrderById).mockResolvedValue(null);
    await expectApiError(commentService.list(BUY_ORDER), "NOT_FOUND");
  });

  it("trả danh sách đã map DTO, truyền đúng target xuống repo", async () => {
    vi.mocked(commentsRepo.listComments).mockResolvedValue([makeComment()]);
    const dtos = await commentService.list(LISTING);
    expect(commentsRepo.listComments).toHaveBeenCalledWith(LISTING);
    expect(dtos).toHaveLength(1);
    expect(dtos[0]).toMatchObject({
      id: "c1",
      userId: "u1",
      userDisplayName: "Taro",
      body: "còn hàng không bạn?",
      listingId: "l1",
      buyOrderId: null,
    });
    expect(dtos[0].createdAt).toBe("2026-07-16T00:00:00.000Z");
  });

  it("đọc bình luận của tin đăng mua đi đúng nhánh buy_order", async () => {
    vi.mocked(commentsRepo.listComments).mockResolvedValue([]);
    await commentService.list(BUY_ORDER);
    expect(commentsRepo.listComments).toHaveBeenCalledWith(BUY_ORDER);
    expect(listingsRepo.findListingById).not.toHaveBeenCalled();
  });
});

describe("create", () => {
  it("404 khi tin không tồn tại → KHÔNG ghi bình luận", async () => {
    vi.mocked(buyOrdersRepo.findBuyOrderById).mockResolvedValue(null);
    await expectApiError(commentService.create("u1", BUY_ORDER, "hi"), "NOT_FOUND");
    expect(commentsRepo.createComment).not.toHaveBeenCalled();
  });

  it("tạo bình luận trên tin bán → báo CHỦ TIN BÁN", async () => {
    vi.mocked(commentsRepo.createComment).mockResolvedValue(makeComment());
    const dto = await commentService.create("u1", LISTING, "còn hàng không bạn?");
    expect(commentsRepo.createComment).toHaveBeenCalledWith(LISTING, "u1", "còn hàng không bạn?");
    expect(dto.body).toBe("còn hàng không bạn?");

    const [recipient, build] = vi.mocked(pushService.notify).mock.calls[0];
    expect(recipient).toBe("chu-tin-ban");
    expect(build()).toMatchObject({ url: "/listings/l1", tag: "comment-listing-l1" });
  });

  it("tạo bình luận trên tin đăng mua → báo NGƯỜI MUA (buyerId), link về /buy-orders", async () => {
    vi.mocked(commentsRepo.createComment).mockResolvedValue(
      makeComment({ listingId: null, buyOrderId: "b1" })
    );
    await commentService.create("u1", BUY_ORDER, "mình có 5 bản");

    const [recipient, build] = vi.mocked(pushService.notify).mock.calls[0];
    expect(recipient).toBe("chu-tin-mua");
    expect(build()).toMatchObject({ url: "/buy-orders/b1", tag: "comment-buy_order-b1" });
  });

  it("chủ tin tự bình luận vào tin mình → KHÔNG tự gửi thông báo", async () => {
    vi.mocked(commentsRepo.createComment).mockResolvedValue(makeComment());
    await commentService.create("chu-tin-ban", LISTING, "cập nhật giá nhé");
    expect(pushService.notify).not.toHaveBeenCalled();
  });

  it("chủ tin đăng mua tự bình luận → KHÔNG tự gửi thông báo", async () => {
    vi.mocked(commentsRepo.createComment).mockResolvedValue(
      makeComment({ listingId: null, buyOrderId: "b1" })
    );
    await commentService.create("chu-tin-mua", BUY_ORDER, "vẫn cần nhé");
    expect(pushService.notify).not.toHaveBeenCalled();
  });
});

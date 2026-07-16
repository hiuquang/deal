/**
 * Test comment-service — 404 khi listing không tồn tại (đọc & viết),
 * và map DTO đúng.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/server/errors";
import { expectApiError } from "./helpers";

vi.mock("@/server/repositories/listings", () => ({
  findListingById: vi.fn(),
}));
vi.mock("@/server/repositories/comments", () => ({
  listComments: vi.fn(),
  createComment: vi.fn(),
}));

import * as listingsRepo from "@/server/repositories/listings";
import * as commentsRepo from "@/server/repositories/comments";
import * as commentService from "@/server/services/comment-service";


function makeComment() {
  return {
    id: "c1",
    listingId: "l1",
    body: "コメントです",
    createdAt: new Date("2026-07-16T00:00:00Z"),
    user: { id: "u1", displayName: "Taro" },
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listingsRepo.findListingById).mockResolvedValue({ id: "l1" } as never);
});

describe("commentService.list", () => {
  it("404 khi listing không tồn tại", async () => {
    vi.mocked(listingsRepo.findListingById).mockResolvedValue(null);
    await expectApiError(commentService.list("nope"), "NOT_FOUND");
  });

  it("trả danh sách comment đã map DTO", async () => {
    vi.mocked(commentsRepo.listComments).mockResolvedValue([makeComment()]);
    const dtos = await commentService.list("l1");
    expect(dtos).toHaveLength(1);
    expect(dtos[0]).toMatchObject({
      id: "c1",
      userId: "u1",
      userDisplayName: "Taro",
      body: "コメントです",
    });
    expect(dtos[0].createdAt).toBe("2026-07-16T00:00:00.000Z");
  });
});

describe("commentService.create", () => {
  it("404 khi listing không tồn tại", async () => {
    vi.mocked(listingsRepo.findListingById).mockResolvedValue(null);
    await expectApiError(commentService.create("u1", "nope", "hi"), "NOT_FOUND");
    expect(commentsRepo.createComment).not.toHaveBeenCalled();
  });

  it("tạo comment → trả DTO", async () => {
    vi.mocked(commentsRepo.createComment).mockResolvedValue(makeComment());
    const dto = await commentService.create("u1", "l1", "コメントです");
    expect(commentsRepo.createComment).toHaveBeenCalledWith("l1", "u1", "コメントです");
    expect(dto.body).toBe("コメントです");
  });
});

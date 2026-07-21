import { ApiError } from "@/server/errors";
import * as commentsRepo from "@/server/repositories/comments";
import * as listingsRepo from "@/server/repositories/listings";
import type { CommentDto } from "@/lib/types";

type CommentWithUser = Awaited<ReturnType<typeof commentsRepo.createComment>>;

function toCommentDto(comment: CommentWithUser): CommentDto {
  return {
    id: comment.id,
    listingId: comment.listingId,
    userId: comment.user.id,
    userDisplayName: comment.user.displayName,
    userIsVip: comment.user.isVip,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
  };
}

/** Ai cũng đọc được — không cần đăng nhập. */
export async function list(listingId: string): Promise<CommentDto[]> {
  const listing = await listingsRepo.findListingById(listingId);
  if (!listing) {
    throw new ApiError(404, "NOT_FOUND", "Không tìm thấy tin đăng.");
  }
  const rows = await commentsRepo.listComments(listingId);
  return rows.map(toCommentDto);
}

/** Viết bình luận: bắt buộc đăng nhập (chống spam). */
export async function create(
  userId: string,
  listingId: string,
  body: string
): Promise<CommentDto> {
  const listing = await listingsRepo.findListingById(listingId);
  if (!listing) {
    throw new ApiError(404, "NOT_FOUND", "Không tìm thấy tin đăng.");
  }
  const comment = await commentsRepo.createComment(listingId, userId, body);
  return toCommentDto(comment);
}

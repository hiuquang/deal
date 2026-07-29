import { ApiError } from "@/server/errors";
import * as commentsRepo from "@/server/repositories/comments";
import * as listingsRepo from "@/server/repositories/listings";
import * as buyOrdersRepo from "@/server/repositories/buy-orders";
import * as pushService from "@/server/services/push-service";
import type { CommentDto } from "@/lib/types";
import type { CommentTarget } from "@/lib/comment-target";

type CommentWithUser = Awaited<ReturnType<typeof commentsRepo.createComment>>;

function toCommentDto(comment: CommentWithUser): CommentDto {
  return {
    id: comment.id,
    listingId: comment.listingId,
    buyOrderId: comment.buyOrderId,
    userId: comment.user.id,
    userDisplayName: comment.user.displayName,
    userIsVip: comment.user.isVip,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
  };
}

/**
 * Tin được bình luận + chủ tin (người nhận thông báo) + tên thẻ.
 * Gộp một chỗ để list/create không lệch nhau về điều kiện tồn tại.
 */
async function loadTarget(target: CommentTarget) {
  if (target.kind === "listing") {
    const listing = await listingsRepo.findListingById(target.id);
    if (!listing) {
      throw new ApiError(404, "NOT_FOUND", "Không tìm thấy tin đăng.");
    }
    return { ownerId: listing.sellerId, cardNameJa: listing.card.nameJa };
  }
  const buyOrder = await buyOrdersRepo.findBuyOrderById(target.id);
  if (!buyOrder) {
    throw new ApiError(404, "NOT_FOUND", "Không tìm thấy tin đăng mua.");
  }
  // Chủ tin đăng mua là NGƯỜI MUA (luồng đảo chiều) — đừng nhầm sang sellerId.
  return { ownerId: buyOrder.buyerId, cardNameJa: buyOrder.card.nameJa };
}

/** Ai cũng đọc được — không cần đăng nhập. */
export async function list(target: CommentTarget): Promise<CommentDto[]> {
  await loadTarget(target);
  const rows = await commentsRepo.listComments(target);
  return rows.map(toCommentDto);
}

/** Viết bình luận: bắt buộc đăng nhập (chống spam). */
export async function create(
  userId: string,
  target: CommentTarget,
  body: string
): Promise<CommentDto> {
  const { ownerId } = await loadTarget(target);
  const comment = await commentsRepo.createComment(target, userId, body);

  // Báo chủ tin có bình luận mới — trừ khi chính chủ tự bình luận vào tin mình
  // (tự nhận thông báo của chính mình là vô nghĩa và gây khó chịu).
  if (ownerId !== userId) {
    const url =
      target.kind === "listing" ? `/listings/${target.id}` : `/buy-orders/${target.id}`;
    pushService.notify(ownerId, () => ({
      title: `${comment.user.displayName} bình luận`,
      body: pushService.preview(body),
      url,
      tag: `comment-${target.kind}-${target.id}`,
    }));
  }

  return toCommentDto(comment);
}

import { prisma } from "@/server/db";
import type { CommentTarget } from "@/lib/comment-target";

/**
 * Bình luận công khai — gắn vào tin BÁN hoặc tin ĐĂNG MUA (v0.24.0).
 * Điều kiện where dựng từ target ở một chỗ duy nhất để không lỡ quên nhánh
 * buy_order khi thêm truy vấn mới.
 */
function whereTarget(target: CommentTarget) {
  return target.kind === "listing" ? { listingId: target.id } : { buyOrderId: target.id };
}

const USER_SELECT = { select: { id: true, displayName: true, isVip: true } };

export function listComments(target: CommentTarget) {
  return prisma.comment.findMany({
    where: whereTarget(target),
    include: { user: USER_SELECT },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
}

export function createComment(target: CommentTarget, userId: string, body: string) {
  return prisma.comment.create({
    data: { ...whereTarget(target), userId, body },
    include: { user: USER_SELECT },
  });
}

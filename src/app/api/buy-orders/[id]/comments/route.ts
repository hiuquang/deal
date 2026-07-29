import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { createCommentSchema } from "@/server/validation";
import { requireVerifiedUser } from "@/server/session";
import * as commentService from "@/server/services/comment-service";

// Bình luận công khai trên tin ĐĂNG MUA — hỏi đáp trước khi chào bán / kết nối.
// Đối xứng hoàn toàn với /api/listings/:id/comments.

// Đọc công khai — không cần đăng nhập.
export const GET = withErrorHandling(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const comments = await commentService.list({ kind: "buy_order", id });
    return NextResponse.json({ comments });
  }
);

export const POST = withErrorHandling(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireVerifiedUser();
    const { id } = await ctx.params;
    const input = createCommentSchema.parse(await req.json());
    const comment = await commentService.create(user.id, { kind: "buy_order", id }, input.body);
    return NextResponse.json({ comment }, { status: 201 });
  }
);

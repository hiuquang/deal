import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { createCommentSchema } from "@/server/validation";
import { requireVerifiedUser } from "@/server/session";
import * as commentService from "@/server/services/comment-service";
import * as rateLimit from "@/server/services/rate-limit-service";

// Đọc công khai — không cần đăng nhập.
export const GET = withErrorHandling(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const comments = await commentService.list({ kind: "listing", id });
    return NextResponse.json({ comments });
  }
);

export const POST = withErrorHandling(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireVerifiedUser();
    await rateLimit.enforce("comment:user", user.id);
    const { id } = await ctx.params;
    const input = createCommentSchema.parse(await req.json());
    const comment = await commentService.create(user.id, { kind: "listing", id }, input.body);
    return NextResponse.json({ comment }, { status: 201 });
  }
);

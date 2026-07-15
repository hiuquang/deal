import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { requireUser } from "@/server/session";
import * as chatService from "@/server/services/chat-service";

// Đánh dấu 1 hội thoại đã đọc (khi user mở/đang xem) → giảm huy hiệu chưa đọc.
export const POST = withErrorHandling(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await ctx.params;
    await chatService.markRead(user.id, id);
    return NextResponse.json({ ok: true });
  }
);

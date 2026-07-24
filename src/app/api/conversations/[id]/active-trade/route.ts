import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { PRIVATE_NO_STORE } from "@/server/cache";
import { requireUser } from "@/server/session";
import * as tradeService from "@/server/services/trade-service";

// Trạng thái trade còn sống của 1 conversation (hoặc null). Panel trade poll
// endpoint này để 2 bên thấy nhau tạo/xác nhận/hủy gần realtime.
export const GET = withErrorHandling(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const trade = await tradeService.getActiveForConversation(user.id, id);
    return NextResponse.json({ trade }, { headers: PRIVATE_NO_STORE });
  }
);

import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import * as ratingService from "@/server/services/rating-service";

// Public: hồ sơ uy tín rút gọn (★ từ rating đã reveal + số giao dịch đã chốt).
export const GET = withErrorHandling(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const user = await ratingService.getUserSummary(id);
    return NextResponse.json({ user });
  }
);

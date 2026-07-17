import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import * as profileService from "@/server/services/profile-service";

// Public: hồ sơ đầy đủ (trust score, level/XP, badge, thống kê, an toàn,
// review, tin đang bán). Bản rút gọn cho danh sách vẫn là /summary.
export const GET = withErrorHandling(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const profile = await profileService.getProfile(id);
    return NextResponse.json({ profile });
  }
);

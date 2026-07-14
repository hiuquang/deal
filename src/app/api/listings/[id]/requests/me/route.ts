import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { requireUser } from "@/server/session";
import * as requestService from "@/server/services/request-service";

// Trạng thái 購入希望 của chính viewer trên listing này (null nếu chưa gửi).
export const GET = withErrorHandling(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const request = await requestService.getMine(user.id, id);
    return NextResponse.json({ request });
  }
);

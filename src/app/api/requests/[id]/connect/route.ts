import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { requireVerifiedUser } from "@/server/session";
import * as requestService from "@/server/services/request-service";

// Seller 連携 với buyer đã chọn → tạo/mở conversation riêng. Idempotent.
export const POST = withErrorHandling(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireVerifiedUser();
    const { id } = await ctx.params;
    const result = await requestService.connect(user.id, id);
    return NextResponse.json(result);
  }
);

import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { requireUser, requireVerifiedUser } from "@/server/session";
import * as requestService from "@/server/services/request-service";

// CHỈ seller xem được danh sách người muốn mua.
export const GET = withErrorHandling(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const requests = await requestService.listForSeller(user.id, id);
    return NextResponse.json({ requests });
  }
);

// Buyer gửi 購入希望.
export const POST = withErrorHandling(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireVerifiedUser();
    const { id } = await ctx.params;
    const request = await requestService.create(user.id, id);
    return NextResponse.json({ request }, { status: 201 });
  }
);

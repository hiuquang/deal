import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { createOfferSchema } from "@/server/validation";
import { requireVerifiedUser } from "@/server/session";
import * as offerService from "@/server/services/buy-order-offer-service";

// Danh sách chào bán — công khai.
export const GET = withErrorHandling(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const offers = await offerService.listForOrder(id);
    return NextResponse.json({ offers });
  }
);

// Người bán đăng chào bán.
export const POST = withErrorHandling(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireVerifiedUser();
    const { id } = await ctx.params;
    const input = createOfferSchema.parse(await req.json());
    const offer = await offerService.create(user.id, id, input);
    return NextResponse.json({ offer }, { status: 201 });
  }
);

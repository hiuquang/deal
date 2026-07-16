import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { requireVerifiedUser } from "@/server/session";
import * as offerService from "@/server/services/buy-order-offer-service";

// Người mua (chủ tin) chọn 1 chào bán → mở conversation riêng.
export const POST = withErrorHandling(
  async (_req: NextRequest, ctx: { params: Promise<{ offerId: string }> }) => {
    const user = await requireVerifiedUser();
    const { offerId } = await ctx.params;
    const result = await offerService.connect(user.id, offerId);
    return NextResponse.json(result);
  }
);

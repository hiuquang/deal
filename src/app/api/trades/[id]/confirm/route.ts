import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { confirmTradeSchema } from "@/server/validation";
import { requireVerifiedUser } from "@/server/session";
import * as tradeService from "@/server/services/trade-service";

export const POST = withErrorHandling(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireVerifiedUser();
    const { id } = await ctx.params;
    const input = confirmTradeSchema.parse(await req.json());
    const trade = await tradeService.confirm(user.id, id, input.finalPriceJpy);
    return NextResponse.json({ trade });
  }
);

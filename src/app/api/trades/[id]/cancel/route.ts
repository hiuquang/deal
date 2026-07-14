import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { requireVerifiedUser } from "@/server/session";
import * as tradeService from "@/server/services/trade-service";

export const POST = withErrorHandling(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireVerifiedUser();
    const { id } = await ctx.params;
    const trade = await tradeService.cancel(user.id, id);
    return NextResponse.json({ trade });
  }
);

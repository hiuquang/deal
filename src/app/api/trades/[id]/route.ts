import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { requireUser } from "@/server/session";
import * as tradeService from "@/server/services/trade-service";

export const GET = withErrorHandling(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const trade = await tradeService.getById(user.id, id);
    return NextResponse.json({ trade });
  }
);

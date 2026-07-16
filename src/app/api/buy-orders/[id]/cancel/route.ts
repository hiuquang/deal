import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { requireUser } from "@/server/session";
import * as buyOrderService from "@/server/services/buy-order-service";

export const POST = withErrorHandling(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const buyOrder = await buyOrderService.cancel(user.id, id);
    return NextResponse.json({ buyOrder });
  }
);

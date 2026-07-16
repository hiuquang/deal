import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import * as buyOrderService from "@/server/services/buy-order-service";

export const GET = withErrorHandling(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const buyOrder = await buyOrderService.getById(id);
    return NextResponse.json({ buyOrder });
  }
);

import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { pricesQuerySchema } from "@/server/validation";
import { requireUser } from "@/server/session";
import * as priceService from "@/server/services/price-service";

export const GET = withErrorHandling(
  async (req: NextRequest, ctx: { params: Promise<{ cardId: string }> }) => {
    const user = await requireUser();
    const { cardId } = await ctx.params;
    const input = pricesQuerySchema.parse({
      condition: req.nextUrl.searchParams.get("condition") ?? undefined,
    });
    const result = await priceService.getForCard(user.id, cardId, input.condition);
    return NextResponse.json(result);
  }
);

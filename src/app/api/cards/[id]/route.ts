import { NextRequest, NextResponse } from "next/server";
import { ApiError, withErrorHandling } from "@/server/errors";
import * as cards from "@/server/repositories/cards";
import { toCardDto } from "@/server/serializers";

export const GET = withErrorHandling(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const card = await cards.findCardById(id);
    if (!card) {
      throw new ApiError(404, "NOT_FOUND", "Không tìm thấy thẻ.");
    }
    return NextResponse.json({ card: toCardDto(card) });
  }
);

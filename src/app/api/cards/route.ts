import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { cardSearchSchema } from "@/server/validation";
import * as cards from "@/server/repositories/cards";
import { toCardDto } from "@/server/serializers";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const params = req.nextUrl.searchParams;
  const input = cardSearchSchema.parse({
    q: params.get("q") ?? undefined,
    game: params.get("game") ?? undefined,
    category: params.get("category") ?? undefined,
  });
  const rows = await cards.searchCards(input.q, input.game, input.category);
  return NextResponse.json({ cards: rows.map(toCardDto) });
});

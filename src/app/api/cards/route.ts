import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { cardSearchSchema, createOtherProductSchema } from "@/server/validation";
import { requireVerifiedUser } from "@/server/session";
import * as cards from "@/server/repositories/cards";
import * as cardService from "@/server/services/card-service";
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

// Tạo sản phẩm mục "その他" (find-or-create theo tên + category).
// Pokémon / One Piece KHÔNG đi qua đây — vẫn chỉ chọn từ catalog.
export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireVerifiedUser();
  const input = createOtherProductSchema.parse(await req.json());
  const card = await cardService.createOtherProduct(input.name, input.category);
  return NextResponse.json({ card }, { status: 201 });
});

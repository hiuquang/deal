import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { cardSearchSchema, createUserProductSchema } from "@/server/validation";
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

// User tự thêm sản phẩm/thẻ khi catalog thiếu (find-or-create theo game + tên
// + category) — mở cho mọi game từ 0.12.1; game mặc định "other" (client cũ).
export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireVerifiedUser();
  const input = createUserProductSchema.parse(await req.json());
  const card = await cardService.createUserProduct(input.game, input.name, input.category);
  return NextResponse.json({ card }, { status: 201 });
});

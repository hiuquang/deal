import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { createBuyOrderSchema, listBuyOrdersSchema } from "@/server/validation";
import { requireUser, requireVerifiedUser } from "@/server/session";
import * as buyOrderService from "@/server/services/buy-order-service";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const params = req.nextUrl.searchParams;
  const input = listBuyOrdersSchema.parse({
    q: params.get("q") ?? undefined,
    game: params.get("game") ?? undefined,
    category: params.get("category") ?? undefined,
    cardId: params.get("cardId") ?? undefined,
    status: params.get("status") ?? undefined,
    page: params.get("page") ?? undefined,
  });
  // mine=1 → chỉ tin của tôi, mọi trạng thái (trang マイページ / quản lý).
  const mine = params.get("mine") === "1";
  const buyerId = mine ? (await requireUser()).id : undefined;
  const result = await buyOrderService.list({
    ...input,
    buyerId,
    status: input.status ?? (mine ? undefined : "active"),
  });
  return NextResponse.json(result);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await requireVerifiedUser();
  const input = createBuyOrderSchema.parse(await req.json());
  const buyOrder = await buyOrderService.create(user.id, input);
  return NextResponse.json({ buyOrder }, { status: 201 });
});

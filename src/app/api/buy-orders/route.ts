import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { createBuyOrderSchema, listBuyOrdersSchema } from "@/server/validation";
import { requireUser, requireVerifiedUser } from "@/server/session";
import * as buyOrderService from "@/server/services/buy-order-service";
import { PRIVATE_NO_STORE, PUBLIC_LIST_CACHE } from "@/server/cache";

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
  // Bản công khai cache được ở edge; mine=1 là dữ liệu cá nhân → no-store.
  return NextResponse.json(result, {
    headers: mine ? PRIVATE_NO_STORE : PUBLIC_LIST_CACHE,
  });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await requireVerifiedUser();
  const input = createBuyOrderSchema.parse(await req.json());
  const buyOrder = await buyOrderService.create(user.id, input);
  return NextResponse.json({ buyOrder }, { status: 201 });
});

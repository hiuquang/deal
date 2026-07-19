import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { createListingSchema, listListingsSchema } from "@/server/validation";
import { requireUser, requireVerifiedUser } from "@/server/session";
import * as listingService from "@/server/services/listing-service";
import { PRIVATE_NO_STORE, PUBLIC_LIST_CACHE } from "@/server/cache";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const params = req.nextUrl.searchParams;
  const input = listListingsSchema.parse({
    q: params.get("q") ?? undefined,
    game: params.get("game") ?? undefined,
    category: params.get("category") ?? undefined,
    cardId: params.get("cardId") ?? undefined,
    status: params.get("status") ?? undefined,
    page: params.get("page") ?? undefined,
  });
  // mine=1 → chỉ listing của tôi, mọi trạng thái (trang マイページ).
  const mine = params.get("mine") === "1";
  const sellerId = mine ? (await requireUser()).id : undefined;
  // Mặc định chỉ hiện tin đang mở — trang chủ là chợ, không phải kho lưu trữ.
  const result = await listingService.list({
    ...input,
    sellerId,
    status: input.status ?? (mine ? undefined : "active"),
  });
  // Bản công khai cache được ở edge; mine=1 là dữ liệu cá nhân → no-store.
  return NextResponse.json(result, {
    headers: mine ? PRIVATE_NO_STORE : PUBLIC_LIST_CACHE,
  });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await requireVerifiedUser();
  const input = createListingSchema.parse(await req.json());
  const listing = await listingService.create(user.id, input);
  return NextResponse.json({ listing }, { status: 201 });
});

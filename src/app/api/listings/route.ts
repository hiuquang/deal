import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { createListingSchema, listListingsSchema } from "@/server/validation";
import { requireUser, requireVerifiedUser } from "@/server/session";
import * as listingService from "@/server/services/listing-service";
import { PRIVATE_NO_STORE, PUBLIC_LIST_CACHE } from "@/server/cache";
import { trangThaiHienTrenCho } from "@/server/showcase";

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
  // Chợ mặc định hiện tin đang mở; khi bật chế độ trưng bày thì kèm cả tin ĐÃ
  // BÁN (xám + băng SOLD) cho trang đỡ trống — xem server/showcase.ts.
  // `mine=1` vẫn lấy mọi trạng thái (trang cá nhân là kho của chính chủ).
  const result = await listingService.list({
    ...input,
    sellerId,
    status: input.status,
    statuses: input.status || mine ? undefined : trangThaiHienTrenCho(),
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

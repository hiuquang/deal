import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { requireUser } from "@/server/session";
import { toggleFavoriteSchema } from "@/server/validation";
import * as favoriteService from "@/server/services/favorite-service";

// Danh sách đã lưu đầy đủ (trang cá nhân).
export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const items = await favoriteService.listSaved(user.id);
  return NextResponse.json({ items });
});

// Bật/tắt lưu 1 tin (listing | buy_order).
export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await requireUser();
  const { kind, id, favorited } = toggleFavoriteSchema.parse(await req.json());
  const result = await favoriteService.toggle(user.id, kind, id, favorited);
  return NextResponse.json(result);
});

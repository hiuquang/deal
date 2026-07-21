import { NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { requireUser } from "@/server/session";
import * as favoriteService from "@/server/services/favorite-service";

// Tập id đã lưu của viewer — client tô tim đầy/rỗng trên thẻ (1 request/trang).
export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const ids = await favoriteService.listIds(user.id);
  return NextResponse.json(ids);
});

import { NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { requireUser } from "@/server/session";
import * as activityService from "@/server/services/activity-service";

// Đánh dấu đã xem hoạt động (mốc = now) → badge ở nav về 0. Gọi khi mở
// trang cá nhân — cùng khuôn với POST /api/conversations/:id/read.
export const POST = withErrorHandling(async () => {
  const user = await requireUser();
  await activityService.markSeen(user.id);
  return NextResponse.json({ ok: true });
});

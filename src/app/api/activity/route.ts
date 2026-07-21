import { NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { requireUser } from "@/server/session";
import * as activityService from "@/server/services/activity-service";

// Hoạt động trên tin của tôi (comment / 購入希望 / chào bán tin gom) — mục
// thông báo ở trang cá nhân.
export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  return NextResponse.json(await activityService.getActivity(user));
});

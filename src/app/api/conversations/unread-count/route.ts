import { NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { requireUser } from "@/server/session";
import * as chatService from "@/server/services/chat-service";
import * as activityService from "@/server/services/activity-service";

// Số liệu cho badge ở nav, gộp 1 endpoint vì bị poll định kỳ (thêm endpoint
// riêng = nhân đôi request poll): `count` = tin chat chưa đọc (badge チャット),
// `activityCount` = hoạt động mới trên tin của mình (badge trang cá nhân).
export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const [count, activityCount] = await Promise.all([
    chatService.getUnreadCount(user.id),
    activityService.countNew(user),
  ]);
  return NextResponse.json({ count, activityCount });
});

import { NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { requireUser } from "@/server/session";
import * as chatService from "@/server/services/chat-service";

// Tổng số tin chưa đọc của user — huy hiệu đỏ ở nav (poll nhẹ).
export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const count = await chatService.getUnreadCount(user.id);
  return NextResponse.json({ count });
});

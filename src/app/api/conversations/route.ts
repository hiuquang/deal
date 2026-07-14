import { NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { requireUser } from "@/server/session";
import * as chatService from "@/server/services/chat-service";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const conversations = await chatService.listMine(user.id);
  return NextResponse.json({ conversations });
});

// POST đã bị gỡ (Phase 3): conversation chỉ được tạo qua
// POST /api/requests/:id/connect — seller toàn quyền chọn đối tác chat.

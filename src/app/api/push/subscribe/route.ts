import { NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { requireUser } from "@/server/session";
import { pushSubscribeSchema, pushUnsubscribeSchema } from "@/server/validation";
import * as pushRepo from "@/server/repositories/push-subscriptions";

/**
 * Bật thông báo trên THIẾT BỊ hiện tại. Idempotent (upsert theo endpoint): gọi
 * lại nhiều lần không sinh bản ghi rác. Client cũng gọi lại mỗi lần vào web để
 * "nhận lại" endpoint về tài khoản đang đăng nhập (trường hợp đổi tài khoản
 * trên cùng máy).
 */
export const POST = withErrorHandling(async (request: Request) => {
  const user = await requireUser();
  const input = pushSubscribeSchema.parse(await request.json());
  const userAgent = request.headers.get("user-agent")?.slice(0, 255) ?? null;
  await pushRepo.upsert(user.id, input.endpoint, input.keys.p256dh, input.keys.auth, userAgent);
  return NextResponse.json({ ok: true });
});

/** Tắt thông báo trên thiết bị hiện tại (các thiết bị khác giữ nguyên). */
export const DELETE = withErrorHandling(async (request: Request) => {
  const user = await requireUser();
  const input = pushUnsubscribeSchema.parse(await request.json());
  await pushRepo.removeByEndpoint(user.id, input.endpoint);
  return NextResponse.json({ ok: true });
});

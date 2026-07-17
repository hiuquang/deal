import { NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { requireUser } from "@/server/session";
import * as authService from "@/server/services/auth-service";
import * as rateLimit from "@/server/services/rate-limit-service";

export const POST = withErrorHandling(async () => {
  const user = await requireUser();
  // Đã đăng nhập nên đếm theo user (không phải IP): nút "gửi lại" bấm liên tục
  // là dội mail thật vào chính hòm thư của họ.
  await rateLimit.enforce("resend:user", user.id);
  await authService.resendVerification(user);
  return NextResponse.json({ ok: true });
});

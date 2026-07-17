import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { loginSchema } from "@/server/validation";
import * as authService from "@/server/services/auth-service";
import * as rateLimit from "@/server/services/rate-limit-service";
import { clientIp } from "@/server/rate-limit";
import { createSession } from "@/server/session";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const input = loginSchema.parse(await req.json());
  const ip = clientIp(req);
  // Chặn 2 chiều: theo IP (1 máy dò nhiều tài khoản) và theo email (nhiều IP
  // cùng dò 1 tài khoản). Đếm TRƯỚC khi so mật khẩu — chỉ đếm lần sai thì kẻ
  // tấn công vẫn thử được vô hạn cho tới lúc đoán trúng.
  await rateLimit.enforce("login:ip", ip);
  await rateLimit.enforce("login:email", input.email);
  const { dto, user } = await authService.login(input);
  // Vào được rồi thì xóa bộ đếm — người thật gõ sai vài lần không bị phạt tiếp.
  await rateLimit.clear("login:email", input.email);
  await rateLimit.clear("login:ip", ip);
  await createSession(user.id);
  return NextResponse.json({ user: dto });
});

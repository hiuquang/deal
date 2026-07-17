import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { resetPasswordSchema } from "@/server/validation";
import * as authService from "@/server/services/auth-service";
import { limitByIp } from "@/server/rate-limit";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const input = resetPasswordSchema.parse(await req.json());
  // Token reset là 32 byte ngẫu nhiên (không dò nổi), nhưng vẫn chặn để không
  // ai bắn hàng loạt token rác vào DB.
  await limitByIp(req, "reset:ip");
  await authService.resetPassword(input.token, input.password);
  return NextResponse.json({ ok: true });
});

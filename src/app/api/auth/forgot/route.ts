import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { forgotPasswordSchema } from "@/server/validation";
import * as authService from "@/server/services/auth-service";

// LUÔN trả ok — không tiết lộ email nào tồn tại trong hệ thống.
export const POST = withErrorHandling(async (req: NextRequest) => {
  const input = forgotPasswordSchema.parse(await req.json());
  await authService.requestPasswordReset(input.email);
  return NextResponse.json({ ok: true });
});

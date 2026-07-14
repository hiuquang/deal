import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { resetPasswordSchema } from "@/server/validation";
import * as authService from "@/server/services/auth-service";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const input = resetPasswordSchema.parse(await req.json());
  await authService.resetPassword(input.token, input.password);
  return NextResponse.json({ ok: true });
});

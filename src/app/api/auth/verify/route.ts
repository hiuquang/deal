import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { verifyTokenSchema } from "@/server/validation";
import * as authService from "@/server/services/auth-service";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const input = verifyTokenSchema.parse(await req.json());
  await authService.verifyEmail(input.token);
  return NextResponse.json({ ok: true });
});

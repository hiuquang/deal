import { NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { requireUser } from "@/server/session";
import * as authService from "@/server/services/auth-service";

export const POST = withErrorHandling(async () => {
  const user = await requireUser();
  await authService.resendVerification(user);
  return NextResponse.json({ ok: true });
});

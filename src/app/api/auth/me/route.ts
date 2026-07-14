import { NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { requireUser } from "@/server/session";
import * as authService from "@/server/services/auth-service";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const me = await authService.getMe(user);
  return NextResponse.json({ user: me });
});

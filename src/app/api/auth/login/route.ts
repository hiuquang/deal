import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { loginSchema } from "@/server/validation";
import * as authService from "@/server/services/auth-service";
import { createSession } from "@/server/session";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const input = loginSchema.parse(await req.json());
  const { dto, user } = await authService.login(input);
  await createSession(user.id);
  return NextResponse.json({ user: dto });
});

import { NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { destroySession } from "@/server/session";

export const POST = withErrorHandling(async () => {
  await destroySession();
  return NextResponse.json({ ok: true });
});

import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { createReportSchema } from "@/server/validation";
import { requireVerifiedUser } from "@/server/session";
import * as reportService from "@/server/services/report-service";
import * as rateLimit from "@/server/services/rate-limit-service";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await requireVerifiedUser();
  await rateLimit.enforce("report:user", user.id);
  const input = createReportSchema.parse(await req.json());
  await reportService.report(user.id, input);
  return NextResponse.json({ ok: true }, { status: 201 });
});

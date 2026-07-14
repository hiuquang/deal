import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { createTradeSchema } from "@/server/validation";
import { requireUser, requireVerifiedUser } from "@/server/session";
import * as tradeService from "@/server/services/trade-service";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const trades = await tradeService.listMine(user.id);
  return NextResponse.json({ trades });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await requireVerifiedUser();
  const input = createTradeSchema.parse(await req.json());
  const trade = await tradeService.create(user.id, input);
  return NextResponse.json({ trade }, { status: 201 });
});

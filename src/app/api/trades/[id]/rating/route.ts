import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { createRatingSchema } from "@/server/validation";
import { requireUser, requireVerifiedUser } from "@/server/session";
import * as ratingService from "@/server/services/rating-service";

export const GET = withErrorHandling(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const state = await ratingService.getState(user.id, id);
    return NextResponse.json(state);
  }
);

export const POST = withErrorHandling(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireVerifiedUser();
    const { id } = await ctx.params;
    const input = createRatingSchema.parse(await req.json());
    const rating = await ratingService.rate(user.id, id, input);
    return NextResponse.json({ rating }, { status: 201 });
  }
);

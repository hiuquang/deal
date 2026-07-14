import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { patchListingSchema } from "@/server/validation";
import { requireVerifiedUser } from "@/server/session";
import * as listingService from "@/server/services/listing-service";

export const GET = withErrorHandling(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const listing = await listingService.getById(id);
    return NextResponse.json({ listing });
  }
);

export const PATCH = withErrorHandling(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireVerifiedUser();
    const { id } = await ctx.params;
    patchListingSchema.parse(await req.json());
    const listing = await listingService.cancel(user.id, id);
    return NextResponse.json({ listing });
  }
);

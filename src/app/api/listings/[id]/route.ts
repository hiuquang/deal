import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { patchListingSchema } from "@/server/validation";
import { requireVerifiedUser } from "@/server/session";
import * as listingService from "@/server/services/listing-service";
import { PUBLIC_LIST_CACHE } from "@/server/cache";

export const GET = withErrorHandling(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const listing = await listingService.getById(id);
    // Chi tiết tin công khai — cache ngắn ở edge (status cũ tối đa 15s, mọi
    // hành động ghi vẫn validate lại phía server nên không mất an toàn).
    return NextResponse.json({ listing }, { headers: PUBLIC_LIST_CACHE });
  }
);

export const PATCH = withErrorHandling(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireVerifiedUser();
    const { id } = await ctx.params;
    const body = patchListingSchema.parse(await req.json());
    // Union: nhánh có `status` = kết thúc tin (cancelled = gỡ / closed = đã
    // bán); nhánh còn lại = sửa giá chào.
    let listing;
    if ("status" in body) {
      listing =
        body.status === "closed"
          ? await listingService.markSold(user.id, id)
          : await listingService.cancel(user.id, id);
    } else {
      listing = await listingService.updatePrice(user.id, id, body.askingPriceJpy);
    }
    return NextResponse.json({ listing });
  }
);

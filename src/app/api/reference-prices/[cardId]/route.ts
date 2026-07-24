import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { PUBLIC_CATALOG_CACHE } from "@/server/cache";
import * as referencePriceService from "@/server/services/reference-price-service";

// GET công khai (không auth, không gate): giá tham khảo nguồn ngoài để người
// mới — kể cả chưa đăng nhập — thấy được mặt bằng giá.
export const GET = withErrorHandling(
  async (_req: NextRequest, ctx: { params: Promise<{ cardId: string }> }) => {
    const { cardId } = await ctx.params;
    const result = await referencePriceService.getForCard(cardId);
    return NextResponse.json(result, { headers: PUBLIC_CATALOG_CACHE });
  }
);

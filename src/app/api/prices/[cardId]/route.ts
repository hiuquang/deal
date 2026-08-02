import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { pricesQuerySchema } from "@/server/validation";
import { getSessionUser } from "@/server/session";
import * as priceService from "@/server/services/price-service";

// CÔNG KHAI từ v0.28.0 (trước là requireUser). Khách vào từ link chia sẻ phải
// thấy được số liệu giá thì trang mới có tác dụng kéo người; phần chi tiết
// từng giao dịch vẫn gate give-to-get trong service.
export const GET = withErrorHandling(
  async (req: NextRequest, ctx: { params: Promise<{ cardId: string }> }) => {
    const user = await getSessionUser();
    const { cardId } = await ctx.params;
    const input = pricesQuerySchema.parse({
      condition: req.nextUrl.searchParams.get("condition") ?? undefined,
    });
    const result = await priceService.getForCard(user?.id ?? null, cardId, input.condition);
    return NextResponse.json(result);
  }
);

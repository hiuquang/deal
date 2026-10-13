import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { kaitoriImportSchema } from "@/server/validation";
import { requireOwner } from "@/server/session";
import * as kaitoriService from "@/server/services/kaitori-service";

// CHỈ CHỦ WEB. Đây là cửa DUY NHẤT đưa giá 買取 vào `reference_prices`, và nó
// chỉ nhận dòng đã có `cardId` do người chọn — Grok không tự gắn thẻ được.
export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireOwner();
  const input = kaitoriImportSchema.parse(await req.json());
  const result = await kaitoriService.importApproved(input.rows);
  return NextResponse.json(result);
});

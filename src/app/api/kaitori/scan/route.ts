import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { kaitoriScanSchema } from "@/server/validation";
import { requireOwner } from "@/server/session";
import * as kaitoriService from "@/server/services/kaitori-service";

// CHỈ CHỦ WEB. Mỗi lượt gọi là tốn tiền API xAI thật → không bao giờ mở công
// khai, và cũng không gọi trong GET để không ai kích hoạt bằng cách dán link.
export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireOwner();
  const input = kaitoriScanSchema.parse(await req.json().catch(() => ({})));
  const result = await kaitoriService.scan(input);
  return NextResponse.json(result);
});

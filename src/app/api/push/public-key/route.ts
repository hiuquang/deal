import { NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import * as pushService from "@/server/services/push-service";

// Khoá công khai VAPID — client cần để đăng ký nhận push. Công khai theo thiết
// kế (không phải bí mật); `null` = chủ web chưa cấu hình → UI ẩn nút bật.
export const GET = withErrorHandling(async () => {
  return NextResponse.json({ publicKey: pushService.getPublicKey() });
});

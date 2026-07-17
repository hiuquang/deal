import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { forgotPasswordSchema } from "@/server/validation";
import * as authService from "@/server/services/auth-service";
import * as rateLimit from "@/server/services/rate-limit-service";
import { limitByIp } from "@/server/rate-limit";

// LUÔN trả ok — không tiết lộ email nào tồn tại trong hệ thống.
export const POST = withErrorHandling(async (req: NextRequest) => {
  const input = forgotPasswordSchema.parse(await req.json());
  // Siết tay nhất trong các endpoint: mỗi lần gọi là một mail thật qua Gmail
  // SMTP. Giới hạn theo email chặn được cả kiểu tấn công đổi IP liên tục để
  // dội mail vào 1 nạn nhân. Không lộ email nào tồn tại: bộ đếm chạy trước và
  // độc lập với việc email có trong DB hay không → 429 đến ở cùng thời điểm.
  await limitByIp(req, "forgot:ip");
  await rateLimit.enforce("forgot:email", input.email);
  await authService.requestPasswordReset(input.email);
  return NextResponse.json({ ok: true });
});

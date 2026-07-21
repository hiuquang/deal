import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/server/errors";
import { registerSchema } from "@/server/validation";
import * as authService from "@/server/services/auth-service";
import { limitByIp } from "@/server/rate-limit";
import {
  assertDailyRegistrationOpen,
  countRegistration,
} from "@/server/services/rate-limit-service";
import { createSession } from "@/server/session";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const input = registerSchema.parse(await req.json());
  // Mỗi lần đăng ký = 1 mail xác nhận thật → chặn tạo tài khoản hàng loạt.
  await limitByIp(req, "register:ip");
  // Trần toàn cục theo ngày — check trước khi tạo, tạo xong mới cộng đếm
  // (đếm tài khoản thành công, không đếm lượt gọi lỗi).
  await assertDailyRegistrationOpen();
  const { dto, user } = await authService.register(input);
  await countRegistration();
  await createSession(user.id);
  return NextResponse.json({ user: dto });
});

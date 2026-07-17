import { ApiError } from "@/server/errors";
import * as rateLimits from "@/server/repositories/rate-limits";

/**
 * Giới hạn theo hành động. Cửa sổ cố định (fixed window) — đủ cho mục tiêu ở
 * đây là chặn dò mật khẩu và spam email, không phải điều tiết lưu lượng tinh vi.
 *
 * Con số chọn theo nguyên tắc: người thật gõ sai vài lần vẫn thoải mái, còn
 * script dò mật khẩu thì chết ngay. Riêng nhóm gửi email siết chặt hơn hẳn —
 * mỗi request là một mail thật qua Gmail SMTP: vừa tốn quota, vừa có nguy cơ
 * bị Google khóa App Password nếu bị lợi dụng làm công cụ spam.
 */
export const LIMITS = {
  "login:ip": { limit: 20, windowMs: 10 * 60 * 1000 },
  "login:email": { limit: 8, windowMs: 10 * 60 * 1000 },
  "register:ip": { limit: 5, windowMs: 60 * 60 * 1000 },
  "forgot:ip": { limit: 6, windowMs: 60 * 60 * 1000 },
  "forgot:email": { limit: 3, windowMs: 60 * 60 * 1000 },
  "reset:ip": { limit: 10, windowMs: 60 * 60 * 1000 },
  "resend:user": { limit: 3, windowMs: 60 * 60 * 1000 },
} as const;

export type LimitAction = keyof typeof LIMITS;

/** Cứ ~1% số lần gọi thì dọn rác cửa sổ hết hạn (không cần cron). */
const SWEEP_CHANCE = 0.01;

function minutesLeft(resetAt: Date): number {
  return Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 60000));
}

/**
 * Đếm một lần dùng; vượt ngưỡng → ném 429 RATE_LIMITED.
 *
 * FAIL-OPEN có chủ đích: lỗi DB (pooler Supabase nguội là chuyện thường) thì
 * cho request đi tiếp thay vì khóa cả app. Không mất mát an ninh — mọi hành
 * động được bảo vệ ở đây đều phải truy vấn DB mới làm được việc, nên DB chết
 * thì kẻ tấn công cũng chẳng dò được gì.
 */
export async function enforce(action: LimitAction, identifier: string): Promise<void> {
  const { limit, windowMs } = LIMITS[action];
  const key = `${action}:${identifier.toLowerCase()}`;
  let count: number;
  let resetAt: Date;
  try {
    ({ count, resetAt } = await rateLimits.hit(key, windowMs));
    if (Math.random() < SWEEP_CHANCE) {
      await rateLimits.sweepExpired().catch(() => {});
    }
  } catch (e) {
    console.error("[rate-limit] bộ đếm lỗi, cho qua:", e);
    return;
  }
  if (count > limit) {
    throw new ApiError(
      429,
      "RATE_LIMITED",
      `リクエストが多すぎます。${minutesLeft(resetAt)}分後にもう一度お試しください。`
    );
  }
}

/** Đăng nhập thành công → xóa bộ đếm để lần gõ sai trước đó không tích lũy. */
export async function clear(action: LimitAction, identifier: string): Promise<void> {
  await rateLimits.reset(`${action}:${identifier.toLowerCase()}`).catch(() => {});
}

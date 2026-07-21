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
  // Mỗi ảnh tới 5MB vào Supabase Storage — chặn spam đầy bucket. Người thật
  // đăng tin nhiều ảnh vẫn dư (30 ảnh/10 phút).
  "upload:user": { limit: 30, windowMs: 10 * 60 * 1000 },
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
      `Bạn thao tác quá nhiều. Vui lòng thử lại sau ${minutesLeft(resetAt)} phút.`
    );
  }
}

/** Đăng nhập thành công → xóa bộ đếm để lần gõ sai trước đó không tích lũy. */
export async function clear(action: LimitAction, identifier: string): Promise<void> {
  await rateLimits.reset(`${action}:${identifier.toLowerCase()}`).catch(() => {});
}

/**
 * Trần đăng ký TOÀN CỤC theo ngày (quyết định chủ web): tối đa
 * DAILY_REGISTRATION_LIMIT tài khoản mới/ngày, reset 0h giờ Nhật.
 *
 * Khác enforce() ở chỗ đếm TÀI KHOẢN TẠO THÀNH CÔNG chứ không đếm lượt gọi:
 * check (không cộng) trước khi tạo, tạo xong route mới gọi countRegistration()
 * — request lỗi (trùng email, sai validate…) không đốt quota, kẻ phá không
 * thể bắn request hỏng để khóa đăng ký cả ngày. Race nhỏ giữa check và cộng
 * có thể lố vài tài khoản lúc cận trần — chấp nhận được với trần kinh doanh
 * (đây không phải ranh giới bảo mật).
 */
export const DAILY_REGISTRATION_LIMIT = 500;

/** Key theo ngày JST — sang ngày mới là key mới (bộ đếm tự về 0), key cũ sweep dọn. */
function dailyRegistrationKey(): string {
  const jstDate = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return `register:daily:${jstDate}`;
}

/** Gọi TRƯỚC khi tạo tài khoản. Đầy trần → 429 REGISTRATION_FULL; DB lỗi → fail-open. */
export async function assertDailyRegistrationOpen(): Promise<void> {
  let count: number;
  try {
    count = await rateLimits.peek(dailyRegistrationKey());
  } catch (e) {
    console.error("[rate-limit] bộ đếm đăng ký ngày lỗi, cho qua:", e);
    return;
  }
  if (count >= DAILY_REGISTRATION_LIMIT) {
    throw new ApiError(
      429,
      "REGISTRATION_FULL",
      "Hôm nay đã đủ số lượng đăng ký mới. Vui lòng đăng ký lại vào ngày mai."
    );
  }
}

/**
 * Gọi SAU khi tạo tài khoản thành công. windowMs 48h chỉ để sweep dọn bản ghi
 * cũ — thứ thật sự reset bộ đếm là key đổi theo ngày. Lỗi DB không phá đăng ký.
 */
export async function countRegistration(): Promise<void> {
  await rateLimits.hit(dailyRegistrationKey(), 48 * 60 * 60 * 1000).catch((e) => {
    console.error("[rate-limit] không cộng được bộ đếm đăng ký ngày:", e);
  });
}

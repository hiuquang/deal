import type { NextRequest } from "next/server";
import { enforce, type LimitAction } from "@/server/services/rate-limit-service";

/**
 * IP client. Ưu tiên `x-vercel-forwarded-for` — header này do edge của Vercel
 * ghi đè nên client KHÔNG giả mạo được; `x-forwarded-for` thì giả mạo thoải
 * mái khi chạy ngoài Vercel, dùng làm dự phòng thôi (lấy entry trái nhất =
 * client gốc). Không xác định được (dev local) → "unknown": mọi request chung
 * một bộ đếm, chấp nhận được vì chỉ xảy ra ở máy dev.
 */
export function clientIp(req: NextRequest): string {
  const vercel = req.headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim();
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Đếm theo IP của request; vượt ngưỡng → ném 429 (withErrorHandling bắt). */
export function limitByIp(req: NextRequest, action: LimitAction): Promise<void> {
  return enforce(action, clientIp(req));
}

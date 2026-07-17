import { prisma } from "@/server/db";

/**
 * Tăng bộ đếm của `key` và trả về số lần đã dùng trong cửa sổ hiện tại.
 *
 * Cả việc "cửa sổ hết hạn thì reset" lẫn "chưa hết hạn thì +1" nằm gọn trong
 * MỘT câu INSERT … ON CONFLICT → atomic ở phía Postgres. Đây là điều bắt buộc:
 * nhiều instance Vercel có thể xử lý request song song, đọc-rồi-ghi ở tầng app
 * sẽ đếm thiếu và thủng giới hạn.
 */
export async function hit(
  key: string,
  windowMs: number
): Promise<{ count: number; resetAt: Date }> {
  const windowEnd = new Date(Date.now() + windowMs);
  const rows = await prisma.$queryRaw<{ count: number; window_end: Date }[]>`
    INSERT INTO rate_limits ("key", "count", "window_end")
    VALUES (${key}, 1, ${windowEnd})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN rate_limits."window_end" <= now() THEN 1
        ELSE rate_limits."count" + 1
      END,
      "window_end" = CASE
        WHEN rate_limits."window_end" <= now() THEN ${windowEnd}
        ELSE rate_limits."window_end"
      END
    RETURNING "count", "window_end"
  `;
  return { count: rows[0].count, resetAt: rows[0].window_end };
}

/** Xóa bộ đếm (dùng khi đăng nhập thành công → không phạt người dùng thật). */
export async function reset(key: string): Promise<void> {
  await prisma.rateLimit.deleteMany({ where: { key } });
}

/** Dọn cửa sổ đã hết hạn. Gọi lazy — không cần cron (giống auto-close trade). */
export async function sweepExpired(): Promise<number> {
  const { count } = await prisma.rateLimit.deleteMany({
    where: { windowEnd: { lte: new Date() } },
  });
  return count;
}

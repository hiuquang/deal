/**
 * Đọc link bài X (`x.com/<handle>/status/<id>`) và giải mốc giờ từ ID.
 *
 * Tách ra hàm thuần vì đây là chỗ DUY NHẤT ta tin được trong output của Grok:
 * mô hình có thể bịa ngày, nhầm handle, thậm chí bịa cả link — nhưng một ID
 * snowflake thì mang sẵn mốc giờ của chính nó, và handle trong link thì đối
 * chiếu được với danh bạ. Mọi thứ khác Grok khai đều bỏ.
 */

const STATUS_URL =
  /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/status(?:es)?\/(\d{6,25})(?:[/?#].*)?$/;

export interface XStatusRef {
  handle: string;
  postId: string;
}

export function parseXStatusUrl(url: string): XStatusRef | null {
  const m = STATUS_URL.exec(url.trim());
  if (!m) return null;
  return { handle: m[1], postId: m[2] };
}

/** Mốc gốc snowflake của Twitter/X: 2010-11-04T01:42:54.657Z. */
const SNOWFLAKE_EPOCH_MS = 1288834974657n;

/**
 * ID bài X là snowflake: 41 bit cao = mili-giây kể từ mốc gốc. Bài trước
 * 11/2010 không dùng snowflake → trả null (đằng nào cũng quá 48 giờ).
 */
export function snowflakeTime(postId: string): Date | null {
  if (!/^\d+$/.test(postId)) return null;
  const ms = (BigInt(postId) >> 22n) + SNOWFLAKE_EPOCH_MS;
  // ID nhỏ (thời tiền snowflake) dịch phải ra 0 → rơi đúng mốc gốc.
  if (ms <= SNOWFLAKE_EPOCH_MS) return null;
  return new Date(Number(ms));
}

/** Link chuẩn để nhúng — luôn dựng lại từ handle + id, không dùng chuỗi Grok đưa. */
export function canonicalStatusUrl(ref: XStatusRef): string {
  return `https://x.com/${ref.handle}/status/${ref.postId}`;
}

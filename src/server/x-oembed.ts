/**
 * Hỏi chính X xem một bài có thật không, qua endpoint oEmbed công khai
 * (publish.twitter.com — miễn phí, không cần khóa, là cùng endpoint X dùng để
 * cấp mã nhúng).
 *
 * Đây là lớp chặn output bịa của Grok: link sai id, bài đã xóa, bài để riêng tư
 * đều trả 404 → không lưu. Và `author_url` cho biết bài THẬT SỰ của ai, nên
 * Grok có gắn nhầm handle thì cũng lộ ở đây.
 */
import { canonicalStatusUrl, type XStatusRef } from "@/lib/x-status";

const OEMBED = "https://publish.twitter.com/oembed";
/** Một bài treo không được giữ chân cả lượt quét (hàm Vercel có trần thời gian). */
const TIMEOUT_MS = 5000;

/**
 * Trả handle tác giả THẬT (theo X) nếu bài tồn tại và công khai; null nếu không.
 * Lỗi mạng cũng trả null: lượt sau quét lại sẽ thử tiếp, còn lưu một bài chưa
 * kiểm được thì sai nguyên tắc.
 */
export async function verifyPostAuthor(ref: XStatusRef): Promise<string | null> {
  const url = `${OEMBED}?url=${encodeURIComponent(canonicalStatusUrl(ref))}&omit_script=true&dnt=true`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as { author_url?: unknown };
    if (typeof body.author_url !== "string") return null;
    // author_url dạng https://twitter.com/<handle>
    const m = /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/?$/.exec(body.author_url);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

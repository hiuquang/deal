/**
 * Bài 買取 của các shop trên X, hiện dưới hàng shop ở /kaitori/[vùng].
 *
 * Luồng: GitHub Actions gọi `refresh()` 4 tiếng/lần (Vercel Hobby chỉ cho cron
 * 1 lần/ngày — xem docs/kaitori.md). Mỗi lượt: xóa bài quá 48 giờ → kiểm trần
 * ngân sách tháng → Grok tìm link bài → lọc → hỏi lại X → lưu LINK.
 *
 * Khác hẳn luồng quét GIÁ ở `kaitori-service.ts` (Grok đề xuất, người duyệt):
 * ở đây KHÔNG có người duyệt, và điều đó chỉ chấp nhận được vì ba lẽ —
 *  1. Thứ được lưu là LINK để nhúng, không phải con số vào dataset giá.
 *     Không bao giờ ghi gì vào reference_prices từ đây.
 *  2. Mọi thứ Grok khai đều bị bỏ trừ cái link, và cái link phải qua 3 lớp:
 *     handle khớp danh bạ, mốc giờ tự giải từ snowflake, và chính X (oEmbed)
 *     xác nhận bài tồn tại + đúng tác giả.
 *  3. Nội dung bài do X tự hiện trong khung nhúng — DEAL không chép chữ/ảnh,
 *     shop xóa bài là bài tự mất.
 */
import * as repo from "@/server/repositories/kaitoriPosts";
import { searchKaitoriPostUrls } from "@/server/xai";
import { verifyPostAuthor } from "@/server/x-oembed";
import { parseXStatusUrl, snowflakeTime } from "@/lib/x-status";
import {
  allPostHandles,
  matchPostHandle,
  regionPostHandles,
  type KaitoriRegion,
} from "@/lib/kaitori-shops";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Bài sống 48 giờ — quyết định chủ web ("2 ngày tự xóa"). */
export const POST_TTL_MS = 2 * DAY;
/** Nhìn ngược 6 giờ cho lịch 4 giờ: GitHub Actions hay trễ, chồng lấn thì dedupe lo. */
const LOOKBACK_MS = 6 * HOUR;
/** Nhật ký lượt quét giữ quá 1 tháng để tính ngân sách tháng trước cũng còn. */
const RUN_LOG_TTL_MS = 40 * DAY;
/** Bài mới chưa từng thấy, tối đa mỗi lượt hỏi lại X — chặn một lượt chạy quá trần thời gian. */
const MAX_VERIFY_PER_RUN = 40;
const VERIFY_CONCURRENCY = 10;
/** Bài "từ tương lai" quá mức lệch đồng hồ cho phép = ID bịa. */
const CLOCK_SKEW_MS = 5 * 60_000;
/** Số bài hiện trên một trang vùng. */
const PAGE_LIMIT = 30;

/**
 * Trần số bài X Search đọc mỗi tháng (xAI tính ~$5/1.000 bài). Mặc định 2.000
 * ≈ $10/tháng. "0" = tắt hẳn việc quét. Chạm trần thì các lượt sau bỏ qua tới
 * đầu tháng sau (giờ JST); bài đã lưu vẫn hiện cho tới khi quá 48 giờ.
 */
export const DEFAULT_MONTHLY_BUDGET = 2000;

export function monthlyBudget(): number {
  const raw = process.env.KAITORI_POSTS_MONTHLY_BUDGET;
  if (raw === undefined || raw.trim() === "") return DEFAULT_MONTHLY_BUDGET;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : DEFAULT_MONTHLY_BUDGET;
}

/** 00:00 ngày 1 của tháng hiện tại theo giờ Nhật — hóa đơn tính theo tháng của người trả. */
export function startOfMonthJst(now: Date): Date {
  const jst = new Date(now.getTime() + 9 * HOUR);
  return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), 1) - 9 * HOUR);
}

function utcDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export interface PostCandidate {
  postId: string;
  /** Đúng chữ hoa/thường như trong danh bạ. */
  handle: string;
  postedAt: Date;
}

/**
 * Lọc link Grok đưa về: chỉ giữ link bài X đúng dạng, của handle CÓ trong danh
 * bạ, mốc giờ (giải từ snowflake) nằm trong 48 giờ qua. Hàm thuần để test.
 */
export function selectCandidates(urls: string[], now: Date): PostCandidate[] {
  const seen = new Set<string>();
  const out: PostCandidate[] = [];
  for (const url of urls) {
    const ref = parseXStatusUrl(url);
    if (!ref) continue;
    const handle = matchPostHandle(ref.handle);
    if (!handle) continue;
    const postedAt = snowflakeTime(ref.postId);
    if (!postedAt) continue;
    const age = now.getTime() - postedAt.getTime();
    if (age > POST_TTL_MS || age < -CLOCK_SKEW_MS) continue;
    if (seen.has(ref.postId)) continue;
    seen.add(ref.postId);
    out.push({ postId: ref.postId, handle, postedAt });
  }
  return out;
}

async function verifyAll(candidates: PostCandidate[]): Promise<PostCandidate[]> {
  const ok: PostCandidate[] = [];
  for (let i = 0; i < candidates.length; i += VERIFY_CONCURRENCY) {
    const chunk = candidates.slice(i, i + VERIFY_CONCURRENCY);
    const authors = await Promise.all(chunk.map((c) => verifyPostAuthor(c)));
    chunk.forEach((c, j) => {
      // Tác giả THẬT theo X phải đúng handle trong link — Grok gắn nhầm là lộ ở đây.
      if (authors[j]?.toLowerCase() === c.handle.toLowerCase()) ok.push(c);
    });
  }
  return ok;
}

export type RefreshResult =
  | { status: "skipped_budget"; purged: number; used: number; budget: number }
  | {
      status: "ok";
      purged: number;
      linksFound: number;
      candidates: number;
      saved: number;
      postsFetched: number;
      used: number;
      budget: number;
    };

export async function refresh(now: Date = new Date()): Promise<RefreshResult> {
  // Xóa TRƯỚC khi quét: hết ngân sách hay Grok lỗi thì luật 48 giờ vẫn chạy.
  const purged = await repo.purgePostsBefore(new Date(now.getTime() - POST_TTL_MS));
  await repo.purgeRunsBefore(new Date(now.getTime() - RUN_LOG_TTL_MS));

  const budget = monthlyBudget();
  const used = await repo.sumPostsFetchedSince(startOfMonthJst(now));
  if (used >= budget) {
    await repo.recordRun({ postsFetched: 0, saved: 0, skipped: "budget" });
    console.warn(`[kaitori-posts] bỏ qua: đã đọc ${used}/${budget} bài trong tháng`);
    return { status: "skipped_budget", purged, used, budget };
  }

  const { urls, postsFetched } = await searchKaitoriPostUrls({
    handles: allPostHandles(),
    fromDate: utcDate(now.getTime() - LOOKBACK_MS),
    // to_date là mốc LOẠI TRỪ → cộng 1 ngày để lấy được bài hôm nay.
    toDate: utcDate(now.getTime() + DAY),
  });

  const candidates = selectCandidates(urls, now);
  const existing = await repo.existingPostIds(candidates.map((c) => c.postId));
  const fresh = candidates.filter((c) => !existing.has(c.postId)).slice(0, MAX_VERIFY_PER_RUN);
  const verified = await verifyAll(fresh);
  const saved = await repo.insertPosts(verified);
  await repo.recordRun({ postsFetched, saved });

  console.log(
    `[kaitori-posts] ${urls.length} link → ${candidates.length} hợp lệ → ${fresh.length} mới → ${saved} đã lưu; xóa ${purged} bài cũ; đọc ${postsFetched} bài (tháng: ${used + postsFetched}/${budget})`
  );
  return {
    status: "ok",
    purged,
    linksFound: urls.length,
    candidates: candidates.length,
    saved,
    postsFetched,
    used: used + postsFetched,
    budget,
  };
}

export interface RegionPosts {
  posts: { postId: string; handle: string; postedAt: Date }[];
  /** Lượt quét thật gần nhất; null = chưa quét lần nào. */
  updatedAt: Date | null;
}

export async function listForRegion(region: KaitoriRegion, now: Date = new Date()): Promise<RegionPosts> {
  // Lọc 48 giờ cả lúc ĐỌC: nếu lịch quét chết, bài cũ vẫn tự biến mất đúng hạn.
  const since = new Date(now.getTime() - POST_TTL_MS);
  const [posts, updatedAt] = await Promise.all([
    repo.listPosts(regionPostHandles(region), since, PAGE_LIMIT),
    repo.lastScanAt(),
  ]);
  return { posts, updatedAt };
}

import { prisma } from "@/server/db";

/** Xóa bài đăng trước mốc `before` — luật "2 ngày tự xóa". Trả số dòng đã xóa. */
export async function purgePostsBefore(before: Date): Promise<number> {
  const { count } = await prisma.kaitoriPost.deleteMany({ where: { postedAt: { lt: before } } });
  return count;
}

/** Trong các id truyền vào, id nào đã có trong DB — để khỏi gọi oEmbed lại. */
export async function existingPostIds(postIds: string[]): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();
  const rows = await prisma.kaitoriPost.findMany({
    where: { postId: { in: postIds } },
    select: { postId: true },
  });
  return new Set(rows.map((r) => r.postId));
}

export interface PostRow {
  postId: string;
  handle: string;
  postedAt: Date;
  /** Giá cao nhất trong bài — chỉ để xếp hạng hiển thị. Vắng = chưa đọc được. */
  topPriceJpy?: number | null;
  topCard?: string | null;
}

/** Ghi bài mới; trùng `postId` (hai lượt quét chồng nhau) thì bỏ qua, không lỗi. */
export async function insertPosts(rows: PostRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const { count } = await prisma.kaitoriPost.createMany({ data: rows, skipDuplicates: true });
  return count;
}

/**
 * Điền giá cho bài ĐÃ có mà còn trống giá — lượt quét sau đọc được giá (vd từ
 * ảnh) thì bài cũ cũng được xếp hạng đúng. Không ghi đè giá đã có: giá đầu
 * tiên đọc được là giá shop đăng lúc đó, lượt sau không có lý do để đổi.
 */
export async function fillMissingPrice(postId: string, topPriceJpy: number, topCard: string | null) {
  const { count } = await prisma.kaitoriPost.updateMany({
    where: { postId, topPriceJpy: null },
    data: { topPriceJpy, topCard },
  });
  return count;
}

/** Bài của các handle, từ mốc `since`, mới nhất trước. */
export function listPosts(handles: string[], since: Date, limit: number) {
  if (handles.length === 0) return Promise.resolve([]);
  return prisma.kaitoriPost.findMany({
    // Handle so không phân biệt hoa/thường — X cũng vậy, và danh bạ có thể
    // được sửa chữ hoa sau khi bài đã lưu.
    where: {
      postedAt: { gte: since },
      OR: handles.map((h) => ({ handle: { equals: h, mode: "insensitive" as const } })),
    },
    orderBy: { postedAt: "desc" },
    take: limit,
    select: { postId: true, handle: true, postedAt: true, topPriceJpy: true, topCard: true },
  });
}

export function recordRun(input: { postsFetched: number; saved: number; skipped?: string | null }) {
  return prisma.kaitoriPostRun.create({
    data: { postsFetched: input.postsFetched, saved: input.saved, skipped: input.skipped ?? null },
  });
}

/** Tổng số bài X Search đã đọc từ mốc `since` — đơn vị xAI tính tiền. */
export async function sumPostsFetchedSince(since: Date): Promise<number> {
  const { _sum } = await prisma.kaitoriPostRun.aggregate({
    where: { ranAt: { gte: since } },
    _sum: { postsFetched: true },
  });
  return _sum.postsFetched ?? 0;
}

/** Lượt quét THẬT gần nhất (không tính lượt bị bỏ qua vì hết ngân sách). */
export async function lastScanAt(): Promise<Date | null> {
  const row = await prisma.kaitoriPostRun.findFirst({
    where: { skipped: null },
    orderBy: { ranAt: "desc" },
    select: { ranAt: true },
  });
  return row?.ranAt ?? null;
}

export async function purgeRunsBefore(before: Date): Promise<number> {
  const { count } = await prisma.kaitoriPostRun.deleteMany({ where: { ranAt: { lt: before } } });
  return count;
}

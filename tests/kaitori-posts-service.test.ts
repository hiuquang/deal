/**
 * Test kaitori-posts-service — luồng quét bài 買取 4 tiếng/lần KHÔNG có người
 * duyệt, nên mọi lớp chặn phải được test thay người:
 * - luật 48 giờ chạy TRƯỚC (cả khi hết ngân sách / Grok lỗi)
 * - hết ngân sách tháng thì không gọi Grok (tiền thật)
 * - link của handle ngoài danh bạ, bài quá 48 giờ, ID "từ tương lai" bị loại
 * - mốc giờ lấy từ snowflake, không phải từ Grok
 * - bài chỉ được lưu khi chính X (oEmbed) xác nhận đúng tác giả
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/repositories/kaitoriPosts", () => ({
  purgePostsBefore: vi.fn(),
  purgeRunsBefore: vi.fn(),
  sumPostsFetchedSince: vi.fn(),
  recordRun: vi.fn(),
  existingPostIds: vi.fn(),
  insertPosts: vi.fn(),
  fillMissingPrice: vi.fn(),
  listPosts: vi.fn(),
  lastScanAt: vi.fn(),
}));
vi.mock("@/server/xai", () => ({ searchKaitoriPosts: vi.fn() }));
vi.mock("@/server/x-oembed", () => ({ verifyPostAuthor: vi.fn() }));

import * as repo from "@/server/repositories/kaitoriPosts";
import { searchKaitoriPosts } from "@/server/xai";
import { verifyPostAuthor } from "@/server/x-oembed";
import {
  DEFAULT_MONTHLY_BUDGET,
  POSTS_ON_PAGE,
  listForRegion,
  monthlyBudget,
  rankForDisplay,
  refresh,
  selectCandidates,
  startOfMonthJst,
} from "@/server/services/kaitori-posts-service";
import { allPostHandles, regionPostHandles } from "@/lib/kaitori-shops";

const mRepo = vi.mocked(repo);
const mSearch = vi.mocked(searchKaitoriPosts);
const mVerify = vi.mocked(verifyPostAuthor);

const NOW = new Date("2026-10-21T03:00:00.000Z");
const HOUR = 3_600_000;

function idAt(ms: number): string {
  return ((BigInt(ms) - 1288834974657n) << 22n).toString();
}
const hoursAgo = (h: number) => idAt(NOW.getTime() - h * HOUR);
const url = (handle: string, id: string) => `https://x.com/${handle}/status/${id}`;

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.KAITORI_POSTS_MONTHLY_BUDGET;
  mRepo.purgePostsBefore.mockResolvedValue(0);
  mRepo.purgeRunsBefore.mockResolvedValue(0);
  mRepo.sumPostsFetchedSince.mockResolvedValue(0);
  mRepo.existingPostIds.mockResolvedValue(new Set());
  mRepo.insertPosts.mockImplementation(async (rows) => rows.length);
  // Mặc định X xác nhận đúng tác giả trong link.
  mVerify.mockImplementation(async (ref) => ref.handle);
});

describe("selectCandidates", () => {
  it("chỉ giữ handle có trong danh bạ, trả đúng chữ hoa/thường của danh bạ", () => {
    const out = selectCandidates(
      [url("hbstnipponbashi", hoursAgo(1)), url("someone_else", hoursAgo(1))],
      NOW
    );
    expect(out.map((c) => c.handle)).toEqual(["HBSTnipponbashi"]);
  });

  it("loại bài quá 48 giờ và ID 'từ tương lai' (bịa)", () => {
    const out = selectCandidates(
      [
        url("hareruya2namba", hoursAgo(47)),
        url("hareruya2namba", hoursAgo(49)),
        url("hareruya2namba", hoursAgo(-1)), // 1 giờ SAU hiện tại
      ],
      NOW
    );
    expect(out).toHaveLength(1);
  });

  it("mốc giờ giải từ snowflake, không lấy gì khác Grok khai", () => {
    const id = hoursAgo(3);
    const [c] = selectCandidates([url("hareruya2namba", id)], NOW);
    expect(c.postedAt.getTime()).toBe(NOW.getTime() - 3 * HOUR);
  });

  it("bỏ link rác và bài trùng (x.com vs twitter.com cùng id)", () => {
    const id = hoursAgo(2);
    const out = selectCandidates(
      ["không phải link", url("hareruya2namba", id), `https://twitter.com/hareruya2namba/status/${id}`],
      NOW
    );
    expect(out).toHaveLength(1);
  });
});

describe("refresh", () => {
  it("xóa bài quá 48 giờ TRƯỚC, kể cả khi sau đó hết ngân sách", async () => {
    mRepo.sumPostsFetchedSince.mockResolvedValue(DEFAULT_MONTHLY_BUDGET);
    await refresh(NOW);
    expect(mRepo.purgePostsBefore).toHaveBeenCalledWith(new Date(NOW.getTime() - 48 * HOUR));
  });

  it("hết ngân sách tháng → KHÔNG gọi Grok, ghi lượt bị bỏ qua", async () => {
    mRepo.sumPostsFetchedSince.mockResolvedValue(DEFAULT_MONTHLY_BUDGET);
    const r = await refresh(NOW);
    expect(r.status).toBe("skipped_budget");
    expect(mSearch).not.toHaveBeenCalled();
    expect(mRepo.recordRun).toHaveBeenCalledWith({ postsFetched: 0, saved: 0, skipped: "budget" });
  });

  it("gọi Grok với đúng danh sách handle và cửa sổ ngày UTC (to_date loại trừ)", async () => {
    mSearch.mockResolvedValue({ posts: [], postsFetched: 0 });
    await refresh(NOW);
    expect(mSearch).toHaveBeenCalledWith({
      handles: allPostHandles(),
      fromDate: "2026-10-20", // NOW - 6 giờ = 20/10 21:00 UTC
      toDate: "2026-10-22",
    });
  });

  it("chỉ lưu bài X xác nhận đúng tác giả; bài đã có thì không hỏi lại X", async () => {
    const real = hoursAgo(1);
    const deleted = hoursAgo(2);
    const wrongAuthor = hoursAgo(3);
    const seen = hoursAgo(4);
    mSearch.mockResolvedValue({
      posts: [
        { url: url("hareruya2namba", real), maxPriceJpy: 95_000_000, card: "ブラッキー☆" },
        { url: url("hareruya2namba", deleted) },
        { url: url("hareruya2namba", wrongAuthor) },
        { url: url("hareruya2namba", seen), maxPriceJpy: 40_000_000, card: "ブラッキー グレート" },
      ],
      postsFetched: 37,
    });
    mRepo.existingPostIds.mockResolvedValue(new Set([seen]));
    mVerify.mockImplementation(async (ref) => {
      if (ref.postId === deleted) return null; // X: 404
      if (ref.postId === wrongAuthor) return "impostor";
      return ref.handle;
    });

    const r = await refresh(NOW);

    expect(mVerify).toHaveBeenCalledTimes(3); // không hỏi lại bài `seen`
    expect(mRepo.insertPosts).toHaveBeenCalledWith([
      {
        postId: real,
        handle: "hareruya2namba",
        postedAt: new Date(NOW.getTime() - HOUR),
        topPriceJpy: 95_000_000,
        topCard: "ブラッキー☆",
      },
    ]);
    // Bài đã có nhưng lượt này đọc được giá → điền giá, không thêm dòng.
    expect(mRepo.fillMissingPrice).toHaveBeenCalledWith(seen, 40_000_000, "ブラッキー グレート");
    expect(mRepo.recordRun).toHaveBeenCalledWith({ postsFetched: 37, saved: 1 });
    expect(r).toMatchObject({ status: "ok", saved: 1, postsFetched: 37, used: 37 });
  });

  it("so tác giả không phân biệt hoa/thường (X trả chữ hoa khác danh bạ vẫn nhận)", async () => {
    mSearch.mockResolvedValue({ posts: [{ url: url("HBSTnipponbashi", hoursAgo(1)) }], postsFetched: 1 });
    mVerify.mockResolvedValue("hbstNipponbashi");
    const r = await refresh(NOW);
    expect(r).toMatchObject({ saved: 1 });
  });
});

describe("monthlyBudget", () => {
  it("trống → mặc định; '0' → tắt hẳn; rác → mặc định", () => {
    expect(monthlyBudget()).toBe(DEFAULT_MONTHLY_BUDGET);
    process.env.KAITORI_POSTS_MONTHLY_BUDGET = "";
    expect(monthlyBudget()).toBe(DEFAULT_MONTHLY_BUDGET);
    process.env.KAITORI_POSTS_MONTHLY_BUDGET = "0";
    expect(monthlyBudget()).toBe(0);
    process.env.KAITORI_POSTS_MONTHLY_BUDGET = "abc";
    expect(monthlyBudget()).toBe(DEFAULT_MONTHLY_BUDGET);
    process.env.KAITORI_POSTS_MONTHLY_BUDGET = "5000";
    expect(monthlyBudget()).toBe(5000);
  });
});

describe("startOfMonthJst", () => {
  it("tính theo tháng giờ Nhật, không phải UTC", () => {
    // 2026-10-31 16:00 UTC = 2026-11-01 01:00 JST → đã sang tháng 11 ở Nhật.
    expect(startOfMonthJst(new Date("2026-10-31T16:00:00Z")).toISOString()).toBe(
      "2026-10-31T15:00:00.000Z"
    );
    // 2026-10-31 14:00 UTC = 23:00 JST cùng ngày → vẫn tháng 10.
    expect(startOfMonthJst(new Date("2026-10-31T14:00:00Z")).toISOString()).toBe(
      "2026-09-30T15:00:00.000Z"
    );
  });
});

describe("listForRegion", () => {
  it("đọc đúng handle của vùng, lọc 48 giờ cả lúc ĐỌC, trả đúng 4 bài đã xếp hạng", async () => {
    const mk = (id: string, h: number, price: number | null) => ({
      postId: id, handle: "hareruya2namba", postedAt: new Date(NOW.getTime() - h * HOUR), topPriceJpy: price, topCard: null,
    });
    mRepo.listPosts.mockResolvedValue([mk("a", 1, null), mk("b", 2, 100), mk("c", 3, 5000), mk("d", 4, 300), mk("e", 5, 200)]);
    mRepo.lastScanAt.mockResolvedValue(null);
    const r = await listForRegion("osaka", NOW);
    expect(mRepo.listPosts).toHaveBeenCalledWith(regionPostHandles("osaka"), new Date(NOW.getTime() - 48 * HOUR), 300);
    expect(r.posts.map((p) => p.postId)).toEqual(["c", "d", "e", "b"]);
  });
});

describe("rankForDisplay — 4 bài: giá cao trước, thiếu thì bù bài mới nhất", () => {
  const mk = (id: string, h: number, price: number | null) => ({
    postId: id, handle: "x", postedAt: new Date(NOW.getTime() - h * HOUR), topPriceJpy: price, topCard: null,
  });

  it("mặc định đúng 4 bài", () => {
    expect(POSTS_ON_PAGE).toBe(4);
  });

  it("giá cao nhất lên trước", () => {
    const r = rankForDisplay([mk("a", 1, 100), mk("b", 2, 9000), mk("c", 3, 500), mk("d", 4, 70), mk("e", 5, 20)]);
    expect(r.map((p) => p.postId)).toEqual(["b", "c", "a", "d"]);
  });

  it("thiếu bài có giá → bù bằng bài chưa có giá, MỚI NHẤT trước", () => {
    const r = rankForDisplay([mk("old", 30, null), mk("p1", 10, 1000), mk("new", 1, null), mk("mid", 5, null)]);
    expect(r.map((p) => p.postId)).toEqual(["p1", "new", "mid", "old"]);
  });

  it("cùng giá thì bài mới hơn lên trước", () => {
    const r = rankForDisplay([mk("cu", 20, 100000), mk("moi", 2, 100000)]);
    expect(r.map((p) => p.postId)).toEqual(["moi", "cu"]);
  });

  it("ít hơn 4 bài thì trả hết, không bịa thêm", () => {
    expect(rankForDisplay([mk("a", 1, null)])).toHaveLength(1);
    expect(rankForDisplay([])).toEqual([]);
  });

  it("không làm xáo mảng gốc", () => {
    const src = [mk("a", 1, 1), mk("b", 2, 2)];
    rankForDisplay(src);
    expect(src.map((p) => p.postId)).toEqual(["a", "b"]);
  });
});

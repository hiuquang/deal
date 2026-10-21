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
  listPosts: vi.fn(),
  lastScanAt: vi.fn(),
}));
vi.mock("@/server/xai", () => ({ searchKaitoriPostUrls: vi.fn() }));
vi.mock("@/server/x-oembed", () => ({ verifyPostAuthor: vi.fn() }));

import * as repo from "@/server/repositories/kaitoriPosts";
import { searchKaitoriPostUrls } from "@/server/xai";
import { verifyPostAuthor } from "@/server/x-oembed";
import {
  DEFAULT_MONTHLY_BUDGET,
  listForRegion,
  monthlyBudget,
  refresh,
  selectCandidates,
  startOfMonthJst,
} from "@/server/services/kaitori-posts-service";
import { allPostHandles, regionPostHandles } from "@/lib/kaitori-shops";

const mRepo = vi.mocked(repo);
const mSearch = vi.mocked(searchKaitoriPostUrls);
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
        url("namba_clabo", hoursAgo(47)),
        url("namba_clabo", hoursAgo(49)),
        url("namba_clabo", hoursAgo(-1)), // 1 giờ SAU hiện tại
      ],
      NOW
    );
    expect(out).toHaveLength(1);
  });

  it("mốc giờ giải từ snowflake, không lấy gì khác Grok khai", () => {
    const id = hoursAgo(3);
    const [c] = selectCandidates([url("namba_clabo", id)], NOW);
    expect(c.postedAt.getTime()).toBe(NOW.getTime() - 3 * HOUR);
  });

  it("bỏ link rác và bài trùng (x.com vs twitter.com cùng id)", () => {
    const id = hoursAgo(2);
    const out = selectCandidates(
      ["không phải link", url("namba_clabo", id), `https://twitter.com/namba_clabo/status/${id}`],
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
    mSearch.mockResolvedValue({ urls: [], postsFetched: 0 });
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
      urls: [
        url("namba_clabo", real),
        url("namba_clabo", deleted),
        url("namba_clabo", wrongAuthor),
        url("namba_clabo", seen),
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
      { postId: real, handle: "namba_clabo", postedAt: new Date(NOW.getTime() - HOUR) },
    ]);
    expect(mRepo.recordRun).toHaveBeenCalledWith({ postsFetched: 37, saved: 1 });
    expect(r).toMatchObject({ status: "ok", saved: 1, postsFetched: 37, used: 37 });
  });

  it("so tác giả không phân biệt hoa/thường (X trả chữ hoa khác danh bạ vẫn nhận)", async () => {
    mSearch.mockResolvedValue({ urls: [url("HBSTnipponbashi", hoursAgo(1))], postsFetched: 1 });
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
  it("đọc đúng handle của vùng, lọc 48 giờ cả lúc ĐỌC", async () => {
    mRepo.listPosts.mockResolvedValue([]);
    mRepo.lastScanAt.mockResolvedValue(null);
    await listForRegion("osaka", NOW);
    expect(mRepo.listPosts).toHaveBeenCalledWith(
      regionPostHandles("osaka"),
      new Date(NOW.getTime() - 48 * HOUR),
      30
    );
  });
});

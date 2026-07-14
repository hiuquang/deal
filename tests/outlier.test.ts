import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/repositories/prices", () => ({
  listUnflaggedPrices: vi.fn(),
}));

import { isOutlier } from "@/server/services/outlier";

describe("isOutlier — flag giá bất thường", () => {
  it("không flag khi chưa đủ 3 mẫu nền (không đủ căn cứ)", () => {
    expect(isOutlier([], 999999)).toBe(false);
    expect(isOutlier([10000], 999999)).toBe(false);
    expect(isOutlier([10000, 11000], 999999)).toBe(false);
  });

  it("không flag giá trong khoảng ±50% median", () => {
    const base = [10000, 10000, 10000]; // median 10000
    expect(isOutlier(base, 10000)).toBe(false);
    expect(isOutlier(base, 14999)).toBe(false);
    expect(isOutlier(base, 5001)).toBe(false);
    expect(isOutlier(base, 15000)).toBe(false); // đúng 50% → chưa vượt
  });

  it("flag giá lệch >50% median (cả bơm lẫn dìm)", () => {
    const base = [10000, 10000, 10000];
    expect(isOutlier(base, 15001)).toBe(true);
    expect(isOutlier(base, 4999)).toBe(true);
    expect(isOutlier(base, 1000000)).toBe(true);
  });

  it("median tính trên mẫu chưa sort sẵn", () => {
    expect(isOutlier([30000, 10000, 20000], 31000)).toBe(true); // median 20000
    expect(isOutlier([30000, 10000, 20000], 29000)).toBe(false);
  });
});

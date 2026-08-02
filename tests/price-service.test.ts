import { describe, expect, it } from "vitest";
import { computeStats, priceAccess } from "@/server/services/price-service";

describe("priceAccess (gate give-to-get)", () => {
  it("thẻ chưa có giao dịch nào → 'empty', KHÔNG khóa dù chưa đóng góp", () => {
    // Khóa một cái hộp rỗng vừa vô nghĩa vừa đuổi khách mới.
    expect(priceAccess(0, 0)).toBe("empty");
    expect(priceAccess(0, 5)).toBe("empty");
  });

  it("có dữ liệu + chưa đóng góp (kể cả khách chưa đăng nhập) → 'teaser'", () => {
    expect(priceAccess(1, 0)).toBe("teaser");
    expect(priceAccess(42, 0)).toBe("teaser");
  });

  it("có dữ liệu + đã đóng góp ≥1 giao dịch → 'full'", () => {
    expect(priceAccess(1, 1)).toBe("full");
    expect(priceAccess(42, 9)).toBe("full");
  });
});

describe("computeStats", () => {
  it("trả null cho mảng rỗng", () => {
    expect(computeStats([])).toEqual({ count: 0, median: null, min: null, max: null });
  });

  it("1 phần tử: median = min = max", () => {
    expect(computeStats([5000])).toEqual({ count: 1, median: 5000, min: 5000, max: 5000 });
  });

  it("số lẻ phần tử: median là phần tử giữa", () => {
    expect(computeStats([300, 100, 200])).toEqual({
      count: 3,
      median: 200,
      min: 100,
      max: 300,
    });
  });

  it("số chẵn phần tử: median là trung bình 2 phần tử giữa (làm tròn)", () => {
    expect(computeStats([100, 200, 301, 400])).toEqual({
      count: 4,
      median: 251, // (200+301)/2 = 250.5 → 251
      min: 100,
      max: 400,
    });
  });

  it("không mutate mảng đầu vào", () => {
    const input = [3, 1, 2];
    computeStats(input);
    expect(input).toEqual([3, 1, 2]);
  });
});

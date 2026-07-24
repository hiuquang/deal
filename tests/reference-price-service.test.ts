import { describe, expect, it } from "vitest";
import { weightedAverage } from "@/server/services/reference-price-service";

describe("weightedAverage", () => {
  it("trả null cho mảng rỗng", () => {
    expect(weightedAverage([])).toBeNull();
  });

  it("trả null khi tổng số lượng = 0", () => {
    expect(weightedAverage([{ priceJpy: 15000, quantity: 0 }])).toBeNull();
  });

  it("1 điểm: bằng chính đơn giá", () => {
    expect(weightedAverage([{ priceJpy: 15000, quantity: 5 }])).toBe(15000);
  });

  it("có trọng số theo số lượng (điểm nhiều pack ảnh hưởng nhiều hơn)", () => {
    // (10000*90 + 20000*10) / 100 = 11000, khác trung bình cộng 15000
    expect(
      weightedAverage([
        { priceJpy: 10000, quantity: 90 },
        { priceJpy: 20000, quantity: 10 },
      ])
    ).toBe(11000);
  });

  it("làm tròn kết quả về số nguyên", () => {
    // (100*1 + 101*2) / 3 = 100.67 → 101
    expect(weightedAverage([
      { priceJpy: 100, quantity: 1 },
      { priceJpy: 101, quantity: 2 },
    ])).toBe(101);
  });

  it("khớp dữ liệu Round One thật (115 pack)", () => {
    const rows = [
      { priceJpy: 15300, quantity: 50 },
      { priceJpy: 15500, quantity: 10 },
      { priceJpy: 15000, quantity: 5 },
      { priceJpy: 14000, quantity: 10 },
      { priceJpy: 14500, quantity: 10 },
      { priceJpy: 13500, quantity: 10 },
      { priceJpy: 13500, quantity: 5 },
      { priceJpy: 13000, quantity: 15 },
    ];
    // tổng giá trị 1,677,500 / 115 pack = 14586.96 → 14587
    expect(weightedAverage(rows)).toBe(14587);
  });
});

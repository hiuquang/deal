import { describe, expect, it } from "vitest";
import {
  ParseError,
  parseFile,
  parseKindToSource,
  parsePrice,
  parseWhen,
} from "../prisma/parse-reference-prices";

// Mốc cố định để test "20:00" = hôm nay theo JST không phụ thuộc ngày chạy test.
// 2026-08-03T01:00:00Z = 2026-08-03 10:00 JST.
const NOW = new Date("2026-08-03T01:00:00Z");

describe("parsePrice", () => {
  it("đọc số thường, có dấu phẩy, có ¥", () => {
    expect(parsePrice("12000")).toBe(12000);
    expect(parsePrice("12,000")).toBe(12000);
    expect(parsePrice("¥12,000")).toBe(12000);
  });

  it("đọc hậu tố k (cách chủ web hay ghi)", () => {
    expect(parsePrice("12k")).toBe(12000);
    expect(parsePrice("12.5k")).toBe(12500);
  });

  it("từ chối giá không đọc được hoặc ra số lẻ", () => {
    expect(() => parsePrice("abc")).toThrow(ParseError);
    expect(() => parsePrice("0")).toThrow(ParseError);
    expect(() => parsePrice("-5000")).toThrow(ParseError);
    expect(() => parsePrice("12.3456k")).toThrow(ParseError); // 12345.6 → lẻ
  });
});

describe("parseWhen", () => {
  it("bỏ trống → lấy thời điểm hiện tại", () => {
    expect(parseWhen("", 0, NOW)).toEqual(NOW);
    expect(parseWhen(undefined, 0, NOW)).toEqual(NOW);
  });

  it("chỉ giờ → hôm nay theo giờ NHẬT, không phải giờ máy", () => {
    // 20:00 JST = 11:00 UTC cùng ngày.
    expect(parseWhen("20:00", 0, NOW).toISOString()).toBe("2026-08-03T11:00:00.000Z");
  });

  it("ngày + giờ → gắn cứng +09:00", () => {
    expect(parseWhen("2026-07-24 06:12", 0, NOW).toISOString()).toBe(
      "2026-07-23T21:12:00.000Z"
    );
  });

  it("từ chối định dạng lạ", () => {
    expect(() => parseWhen("tối qua", 0, NOW)).toThrow(ParseError);
  });
});

describe("parseKindToSource", () => {
  it("mặc định là giá rao — giá trong group chủ yếu là giá rao", () => {
    expect(parseKindToSource(undefined)).toBe("Facebook (giá rao)");
    expect(parseKindToSource("")).toBe("Facebook (giá rao)");
    expect(parseKindToSource("rao")).toBe("Facebook (giá rao)");
  });

  it("ban / bán → đã bán", () => {
    expect(parseKindToSource("ban")).toBe("Facebook (đã bán)");
    expect(parseKindToSource("bán")).toBe("Facebook (đã bán)");
  });

  it("giá trị lạ thì báo lỗi thay vì âm thầm coi là giá rao", () => {
    expect(() => parseKindToSource("sold")).toThrow(ParseError);
  });
});

describe("parseFile", () => {
  it("đọc header bối cảnh + dòng tối thiểu (chỉ tên | giá)", () => {
    const rows = parseFile("# onepiece box\nOP-09 | 12k\n", NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      game: "onepiece",
      category: "box",
      name: "OP-09",
      priceJpy: 12000,
      quantity: 1,
      source: "Facebook (giá rao)",
    });
  });

  it("header sau ghi đè header trước", () => {
    const rows = parseFile(
      ["# onepiece box", "OP-09 | 12k", "# pokemon single", "Pikachu | 3000"].join("\n"),
      NOW
    );
    expect(rows[0]).toMatchObject({ game: "onepiece", category: "box" });
    expect(rows[1]).toMatchObject({ game: "pokemon", category: "single" });
  });

  it("dòng # không khai đủ game+category chỉ là ghi chú", () => {
    const rows = parseFile("# onepiece box\n# ghi chú linh tinh\nOP-09 | 12k", NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0].game).toBe("onepiece");
  });

  it("đọc đủ 5 ô + bỏ qua dòng trống", () => {
    const rows = parseFile("# onepiece box\n\nOP-09 | 11.5k | 3 | ban | 2026-08-02 21:30\n\n", NOW);
    expect(rows[0]).toMatchObject({
      priceJpy: 11500,
      quantity: 3,
      source: "Facebook (đã bán)",
    });
    expect(rows[0].recordedAt.toISOString()).toBe("2026-08-02T12:30:00.000Z");
  });

  it("dữ liệu trước khi khai loại sản phẩm → báo lỗi kèm số dòng", () => {
    expect(() => parseFile("OP-09 | 12k", NOW)).toThrow(/Dòng 1/);
  });

  it("thiếu ô giá → báo lỗi", () => {
    expect(() => parseFile("# onepiece box\nOP-09", NOW)).toThrow(/Dòng 2/);
  });

  it("số lượng không hợp lệ → báo lỗi thay vì lặng lẽ thành 1", () => {
    expect(() => parseFile("# onepiece box\nOP-09 | 12k | 0", NOW)).toThrow(ParseError);
    expect(() => parseFile("# onepiece box\nOP-09 | 12k | hai", NOW)).toThrow(ParseError);
  });

  it("file chỉ có ghi chú → không có dòng nào", () => {
    expect(parseFile("# onepiece box\n# chưa nhập gì\n", NOW)).toEqual([]);
  });
});

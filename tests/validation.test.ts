import { describe, expect, it } from "vitest";
import {
  confirmTradeSchema,
  createListingSchema,
  createMessageSchema,
  createTradeSchema,
  listListingsSchema,
  registerSchema,
} from "@/server/validation";

describe("registerSchema", () => {
  const valid = {
    email: "a@b.com",
    password: "12345678",
    displayName: "Taro",
    agreeTerms: true,
  };

  it("chấp nhận input hợp lệ", () => {
    expect(() => registerSchema.parse(valid)).not.toThrow();
  });

  it("từ chối khi chưa đồng ý điều khoản", () => {
    expect(() => registerSchema.parse({ ...valid, agreeTerms: false })).toThrow();
    expect(() => registerSchema.parse({ ...valid, agreeTerms: undefined })).toThrow();
  });

  it("từ chối password < 8 ký tự và email sai định dạng", () => {
    expect(() => registerSchema.parse({ ...valid, password: "short" })).toThrow();
    expect(() => registerSchema.parse({ ...valid, email: "not-an-email" })).toThrow();
  });
});

describe("createListingSchema", () => {
  const base = {
    cardId: "c1",
    condition: "PSA10",
    imageUrl: "/uploads/abc-123.jpg",
    tradeType: "sell",
  };

  it("chấp nhận listing hợp lệ (không cần giá)", () => {
    expect(() => createListingSchema.parse(base)).not.toThrow();
  });

  it("từ chối condition ngoài danh sách", () => {
    expect(() => createListingSchema.parse({ ...base, condition: "MINT" })).toThrow();
  });

  it("từ chối imageUrl không thuộc /uploads/", () => {
    expect(() =>
      createListingSchema.parse({ ...base, imageUrl: "https://evil.com/x.jpg" })
    ).toThrow();
  });
});

describe("giới hạn giá giao dịch (1 ~ 10,000,000 JPY)", () => {
  it.each([0, -100, 10_000_001, 1.5])("từ chối %s", (price) => {
    expect(() =>
      createTradeSchema.parse({ conversationId: "cv1", finalPriceJpy: price })
    ).toThrow();
    expect(() => confirmTradeSchema.parse({ finalPriceJpy: price })).toThrow();
  });

  it.each([1, 5000, 10_000_000])("chấp nhận %s", (price) => {
    expect(() =>
      createTradeSchema.parse({ conversationId: "cv1", finalPriceJpy: price })
    ).not.toThrow();
  });
});

describe("listListingsSchema — tìm sản phẩm", () => {
  it("trim từ khóa q và mặc định page = 1", () => {
    const parsed = listListingsSchema.parse({ q: "  リザードン  " });
    expect(parsed.q).toBe("リザードン");
    expect(parsed.page).toBe(1);
  });

  it("q optional — bỏ trống vẫn hợp lệ", () => {
    expect(() => listListingsSchema.parse({})).not.toThrow();
  });

  it("từ chối q quá 100 ký tự", () => {
    expect(() => listListingsSchema.parse({ q: "あ".repeat(101) })).toThrow();
  });
});

describe("createMessageSchema", () => {
  it("từ chối chuỗi rỗng/toàn khoảng trắng và > 1000 ký tự", () => {
    expect(() => createMessageSchema.parse({ body: "   " })).toThrow();
    expect(() => createMessageSchema.parse({ body: "a".repeat(1001) })).toThrow();
  });
});

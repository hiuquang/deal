/**
 * Test đọc link bài X + giải mốc giờ từ snowflake — lớp đầu tiên lọc output
 * của Grok. Mốc giờ ở đây là thứ quyết định bài có bị ẩn sau 48 giờ không,
 * nên phải đúng tới mili-giây chứ không chỉ "trông hợp lý".
 */
import { describe, expect, it } from "vitest";
import { canonicalStatusUrl, parseXStatusUrl, snowflakeTime } from "@/lib/x-status";

/** Dựng ID snowflake cho một mốc giờ (đảo ngược đúng công thức X dùng). */
function idAt(iso: string): string {
  return ((BigInt(new Date(iso).getTime()) - 1288834974657n) << 22n).toString();
}

describe("parseXStatusUrl", () => {
  it("nhận x.com, twitter.com, www., mobile., /statuses/ và đuôi query", () => {
    expect(parseXStatusUrl("https://x.com/namba_clabo/status/1849000000000000000")).toEqual({
      handle: "namba_clabo",
      postId: "1849000000000000000",
    });
    for (const url of [
      "https://twitter.com/namba_clabo/status/1849000000000000000",
      "https://www.x.com/namba_clabo/status/1849000000000000000",
      "https://mobile.twitter.com/namba_clabo/statuses/1849000000000000000",
      "https://x.com/namba_clabo/status/1849000000000000000?s=20",
      "https://x.com/namba_clabo/status/1849000000000000000/photo/1",
    ]) {
      expect(parseXStatusUrl(url)?.postId, url).toBe("1849000000000000000");
    }
  });

  it("từ chối mọi thứ không phải link một bài X", () => {
    for (const url of [
      "https://x.com/namba_clabo",
      "https://x.com/i/status/abc",
      "https://evil.com/namba_clabo/status/1849000000000000000",
      "https://x.com.evil.com/namba_clabo/status/1849000000000000000",
      "https://x.com/handle_dai_qua_muoi_lam/status/1849000000000000000",
      "javascript:alert(1)",
      "",
    ]) {
      expect(parseXStatusUrl(url), url).toBeNull();
    }
  });
});

describe("snowflakeTime", () => {
  it("giải đúng tới mili-giây", () => {
    const iso = "2026-10-21T03:15:42.123Z";
    expect(snowflakeTime(idAt(iso))?.toISOString()).toBe(iso);
  });

  it("bit thấp (máy chủ + số thứ tự) không làm lệch giờ", () => {
    const base = BigInt(idAt("2026-10-21T00:00:00.000Z"));
    expect(snowflakeTime((base + 4_194_303n).toString())?.toISOString()).toBe("2026-10-21T00:00:00.000Z");
  });

  it("ID thời tiền snowflake hoặc không phải số → null", () => {
    expect(snowflakeTime("20")).toBeNull();
    expect(snowflakeTime("abc")).toBeNull();
    expect(snowflakeTime("")).toBeNull();
  });
});

describe("canonicalStatusUrl", () => {
  it("luôn dựng lại link sạch từ handle + id", () => {
    expect(canonicalStatusUrl({ handle: "namba_clabo", postId: "123456789" })).toBe(
      "https://x.com/namba_clabo/status/123456789"
    );
  });
});

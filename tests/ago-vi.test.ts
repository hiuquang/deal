import { describe, expect, it } from "vitest";
import { agoVi } from "@/lib/ago-vi";

const NOW = new Date("2026-10-23T03:00:00Z");
const ago = (ms: number) => agoVi(new Date(NOW.getTime() - ms), NOW);
const MIN = 60_000;

describe("agoVi", () => {
  it("dưới 1 phút / phút / giờ / hôm qua / ngày", () => {
    expect(ago(20_000)).toBe("vừa đăng");
    expect(ago(5 * MIN)).toBe("5 phút trước");
    expect(ago(59 * MIN)).toBe("59 phút trước");
    expect(ago(60 * MIN)).toBe("1 giờ trước");
    expect(ago(23 * 60 * MIN)).toBe("23 giờ trước");
    expect(ago(30 * 60 * MIN)).toBe("hôm qua");
    expect(ago(50 * 60 * MIN)).toBe("2 ngày trước");
  });

  it("mốc 'tương lai' (đồng hồ lệch) không ra số âm", () => {
    expect(ago(-3 * MIN)).toBe("vừa đăng");
  });
});

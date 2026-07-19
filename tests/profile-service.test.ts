/**
 * Test profile-service — các hàm tính thuần của hệ tin cậy:
 * - XP/level derived đúng công thức, biên bậc tier khớp spec
 * - Trust Score: người mới = 50, clamp 0–100, report xác minh phạt nặng,
 *   report chờ xử lý KHÔNG ảnh hưởng điểm
 * - Badge: cần đủ mẫu (Perfect Rating ≥10 đánh giá, No Report cần có hoạt động)
 * - Safety: 🔴 chỉ khi đã xác minh; 🟡 cần ≥2 người report khác nhau (chống
 *   1 người report bẩn); đỏ đè vàng
 */
import { describe, expect, it } from "vitest";
import {
  XP_PER_LEVEL,
  computeBadges,
  computeTrustScore,
  computeXp,
  displayLevel,
  levelFromXp,
  safetyLevel,
  tierFromLevel,
} from "@/server/services/profile-service";

describe("computeXp / levelFromXp", () => {
  it("cộng đúng: trade 30, 5★ 10, mỗi 30 ngày sạch 100", () => {
    expect(computeXp({ closedTrades: 2, fiveStarCount: 1, cleanDays: 65 })).toBe(
      2 * 30 + 10 + 2 * 100
    );
  });

  it("tài khoản mới tinh = 0 XP, level 1", () => {
    expect(computeXp({ closedTrades: 0, fiveStarCount: 0, cleanDays: 0 })).toBe(0);
    expect(levelFromXp(0)).toBe(1);
  });

  it("đúng ngưỡng XP thì lên level (không sớm 1 XP)", () => {
    expect(levelFromXp(XP_PER_LEVEL - 1)).toBe(1);
    expect(levelFromXp(XP_PER_LEVEL)).toBe(2);
  });
});

describe("displayLevel — VIP có sàn level 10", () => {
  it("không VIP → giữ nguyên level thật", () => {
    expect(displayLevel(0, false)).toBe(1);
    expect(displayLevel(5 * XP_PER_LEVEL, false)).toBe(6);
  });

  it("VIP mới (level thật thấp) → nâng lên đúng 10", () => {
    expect(displayLevel(0, true)).toBe(10);
    expect(displayLevel(3 * XP_PER_LEVEL, true)).toBe(10); // thật là 4 < 10
  });

  it("VIP đã tự đạt cao hơn 10 → giữ mức cao hơn, không kéo tụt", () => {
    // 17 * XP_PER_LEVEL → level 18
    expect(displayLevel(17 * XP_PER_LEVEL, true)).toBe(18);
  });
});

describe("tierFromLevel — biên bậc theo spec", () => {
  it.each([
    [1, "bronze"],
    [10, "bronze"],
    [11, "silver"],
    [25, "silver"],
    [26, "gold"],
    [50, "gold"],
    [51, "platinum"],
    [80, "platinum"],
    [81, "master"],
    [100, "master"],
    [101, "legendary"],
  ] as const)("level %i → %s", (level, tier) => {
    expect(tierFromLevel(level)).toBe(tier);
  });
});

describe("computeTrustScore", () => {
  const newbie = {
    closedTrades: 0,
    distinctPartners: 0,
    cancelledTrades: 0,
    accountAgeDays: 0,
    ratingAvg: null,
    verifiedReports: 0,
  };

  it("người mới = 50 (trung lập)", () => {
    expect(computeTrustScore(newbie)).toBe(50);
  });

  it("hồ sơ đẹp tối đa = 100", () => {
    expect(
      computeTrustScore({
        closedTrades: 50,
        distinctPartners: 30,
        cancelledTrades: 0,
        accountAgeDays: 400,
        ratingAvg: 5,
        verifiedReports: 0,
      })
    ).toBe(100);
  });

  it("report đã xác minh phạt -25/lần, sàn -50", () => {
    expect(computeTrustScore({ ...newbie, verifiedReports: 1 })).toBe(25);
    expect(computeTrustScore({ ...newbie, verifiedReports: 4 })).toBe(0);
  });

  it("không âm, không vượt 100 (clamp)", () => {
    expect(
      computeTrustScore({ ...newbie, ratingAvg: 1, verifiedReports: 10 })
    ).toBe(0);
  });

  it("tỷ lệ hoàn thành ≥90% không bị phạt, thấp thì trừ", () => {
    const base = { ...newbie, closedTrades: 9, distinctPartners: 3, cancelledTrades: 1 };
    const ninety = computeTrustScore(base); // 9/10 = 90%
    const half = computeTrustScore({ ...base, closedTrades: 5, cancelledTrades: 5 });
    expect(ninety).toBeGreaterThan(half);
  });

  it("trade lặp với 1 đồng bọn ăn ít điểm hơn trade đa dạng", () => {
    const farm = computeTrustScore({ ...newbie, closedTrades: 10, distinctPartners: 1 });
    const real = computeTrustScore({ ...newbie, closedTrades: 10, distinctPartners: 10 });
    expect(real).toBeGreaterThan(farm);
  });
});

describe("computeBadges", () => {
  const base = {
    closedTrades: 0,
    closedAsSeller: 0,
    ratingAvg: null as number | null,
    ratingCount: 0,
    trustScore: 50,
    verifiedReports: 0,
    accountAgeDays: 0,
  };

  it("tài khoản mới không có badge nào", () => {
    expect(computeBadges(base)).toEqual([]);
  });

  it("mốc trade chỉ lấy mốc cao nhất (500 > 100 > 10)", () => {
    expect(computeBadges({ ...base, closedTrades: 10 })).toContain("trades10");
    const b500 = computeBadges({ ...base, closedTrades: 500 });
    expect(b500).toContain("trades500");
    expect(b500).not.toContain("trades100");
  });

  it("Perfect Rating cần avg 5.0 VÀ ≥10 đánh giá", () => {
    expect(computeBadges({ ...base, ratingAvg: 5, ratingCount: 9 })).not.toContain(
      "perfectRating"
    );
    expect(computeBadges({ ...base, ratingAvg: 5, ratingCount: 10 })).toContain(
      "perfectRating"
    );
  });

  it("No Report cần có hoạt động (≥5 trade, ≥30 ngày) chứ không phải mới tinh", () => {
    expect(computeBadges({ ...base, accountAgeDays: 40 })).not.toContain("noReport");
    expect(
      computeBadges({ ...base, closedTrades: 5, accountAgeDays: 40 })
    ).toContain("noReport");
  });

  it("có report xác minh thì mất No Report", () => {
    expect(
      computeBadges({ ...base, closedTrades: 5, accountAgeDays: 40, verifiedReports: 1 })
    ).not.toContain("noReport");
  });
});

describe("safetyLevel", () => {
  it("mặc định 🟢", () => {
    expect(safetyLevel(0, 0)).toBe("green");
  });

  it("1 report chờ xử lý KHÔNG đổi hiển thị (chống report bẩn) — cần ≥2 người", () => {
    expect(safetyLevel(0, 1)).toBe("green");
    expect(safetyLevel(0, 2)).toBe("yellow");
  });

  it("vi phạm đã xác minh → 🔴, đè cả 🟡", () => {
    expect(safetyLevel(1, 0)).toBe("red");
    expect(safetyLevel(1, 5)).toBe("red");
  });
});

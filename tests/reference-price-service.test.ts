import { beforeEach, describe, expect, it, vi } from "vitest";
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

// ── Tách nhóm theo loại giá (v0.32.0) ────────────────────────────────────
// Bất biến: KHÔNG trộn 買取 (shop thu vào) với giá rao vào cùng một thống kê.
// Trộn ra con số vô nghĩa mà nhìn vẫn như thật — lỗi tồn tại từ v0.21.0.
vi.mock("@/server/repositories/cards", () => ({ findCardById: vi.fn() }));
vi.mock("@/server/repositories/referencePrices", () => ({
  listReferencePrices: vi.fn(),
}));

describe("getForCard — tách nhóm theo kind", () => {
  const card = {
    id: "card1",
    game: "onepiece",
    category: "box",
    setCode: "CUSTOM-BOX",
    cardNumber: "X",
    language: "JP",
    nameJa: "X",
    nameEn: "X",
    rarity: "-",
  };
  const row = (kind: string, priceJpy: number) => ({
    source: kind === "kaitori" ? "yuyu_tei" : "Facebook (giá rao)",
    kind,
    quantity: 1,
    priceJpy,
    note: null,
    sourceUrl: null,
    recordedAt: new Date("2026-10-10T03:00:00Z"),
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    const cardsRepo = await import("@/server/repositories/cards");
    vi.mocked(cardsRepo.findCardById).mockResolvedValue(card as never);
  });

  it("mỗi loại có thống kê RIÊNG, không gộp chung một trung bình", async () => {
    const repo = await import("@/server/repositories/referencePrices");
    vi.mocked(repo.listReferencePrices).mockResolvedValue([
      row("kaitori", 10000),
      row("rao", 20000),
    ] as never);

    const { getForCard } = await import("@/server/services/reference-price-service");
    const { groups } = await getForCard("card1");

    expect(groups.map((g) => g.kind)).toEqual(["kaitori", "rao"]);
    expect(groups[0].stats.weightedAvg).toBe(10000);
    expect(groups[1].stats.weightedAvg).toBe(20000);
    // Nếu còn trộn thì cả hai sẽ ra 15000 — khoá lại đúng chỗ đó.
    expect(groups.some((g) => g.stats.weightedAvg === 15000)).toBe(false);
  });

  it("thứ tự luôn là sàn → thật → trần (kaitori, ban, rao)", async () => {
    const repo = await import("@/server/repositories/referencePrices");
    vi.mocked(repo.listReferencePrices).mockResolvedValue([
      row("rao", 20000),
      row("kaitori", 10000),
      row("ban", 15000),
    ] as never);

    const { getForCard } = await import("@/server/services/reference-price-service");
    const { groups } = await getForCard("card1");
    expect(groups.map((g) => g.kind)).toEqual(["kaitori", "ban", "rao"]);
  });

  it("nhóm rỗng bị loại, không trả ô trống ra UI", async () => {
    const repo = await import("@/server/repositories/referencePrices");
    vi.mocked(repo.listReferencePrices).mockResolvedValue([row("kaitori", 10000)] as never);

    const { getForCard } = await import("@/server/services/reference-price-service");
    const { groups } = await getForCard("card1");
    expect(groups).toHaveLength(1);
  });

  it("kind lạ trong DB rơi về 'rao' thay vì biến mất", async () => {
    const repo = await import("@/server/repositories/referencePrices");
    vi.mocked(repo.listReferencePrices).mockResolvedValue([row("linh-tinh", 12000)] as never);

    const { getForCard } = await import("@/server/services/reference-price-service");
    const { groups } = await getForCard("card1");
    expect(groups).toHaveLength(1);
    expect(groups[0].kind).toBe("rao");
  });
});

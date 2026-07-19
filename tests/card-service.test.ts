/**
 * Test card-service — find-or-create sản phẩm user tự thêm (mọi game, 0.12.1):
 * tái sử dụng entry trùng tên, tạo mới khi chưa có, nhánh race P2002, và
 * quy ước setCode (OTHER cho mục その他, CUSTOM cho pokemon/onepiece).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("@/server/repositories/cards", async (importOriginal) => ({
  // Giữ userProductSetCode thật (hàm thuần) — chỉ mock 2 hàm chạm DB.
  ...(await importOriginal<typeof import("@/server/repositories/cards")>()),
  findUserProduct: vi.fn(),
  createUserProduct: vi.fn(),
}));

import * as cardsRepo from "@/server/repositories/cards";
import * as cardService from "@/server/services/card-service";

function makeCard(overrides: Record<string, unknown> = {}) {
  return {
    id: "card1",
    game: "other",
    category: "single",
    setCode: "OTHER",
    cardNumber: "プレイマット",
    language: "JP",
    nameJa: "プレイマット",
    nameEn: "プレイマット",
    rarity: "-",
    ...overrides,
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("cardService.createUserProduct", () => {
  it("tái sử dụng sản phẩm đã tồn tại cùng game + tên + category", async () => {
    vi.mocked(cardsRepo.findUserProduct).mockResolvedValue(makeCard());
    const dto = await cardService.createUserProduct("other", "プレイマット", "single");
    expect(dto.id).toBe("card1");
    expect(dto.game).toBe("other");
    expect(cardsRepo.createUserProduct).not.toHaveBeenCalled();
  });

  it("tạo mới khi chưa tồn tại (truyền đủ game)", async () => {
    vi.mocked(cardsRepo.findUserProduct).mockResolvedValue(null);
    vi.mocked(cardsRepo.createUserProduct).mockResolvedValue(makeCard({ id: "new1" }));
    const dto = await cardService.createUserProduct("other", "プレイマット", "single");
    expect(cardsRepo.createUserProduct).toHaveBeenCalledWith("other", "プレイマット", "single");
    expect(dto.id).toBe("new1");
  });

  it("pokemon cũng tạo được (0.12.1 — nới business-rules #13)", async () => {
    vi.mocked(cardsRepo.findUserProduct).mockResolvedValue(null);
    vi.mocked(cardsRepo.createUserProduct).mockResolvedValue(
      makeCard({ id: "pk1", game: "pokemon", setCode: "CUSTOM", nameJa: "ピカチュウAR" })
    );
    const dto = await cardService.createUserProduct("pokemon", "ピカチュウAR", "single");
    expect(cardsRepo.createUserProduct).toHaveBeenCalledWith("pokemon", "ピカチュウAR", "single");
    expect(dto.game).toBe("pokemon");
    expect(dto.setCode).toBe("CUSTOM");
  });

  it("race 2 request cùng tạo → P2002 → trả về bản ghi thắng cuộc", async () => {
    vi.mocked(cardsRepo.findUserProduct)
      .mockResolvedValueOnce(null) // check đầu: chưa có
      .mockResolvedValueOnce(makeCard({ id: "winner" })); // refetch sau P2002
    vi.mocked(cardsRepo.createUserProduct).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "test",
      })
    );
    const dto = await cardService.createUserProduct("other", "プレイマット", "single");
    expect(dto.id).toBe("winner");
  });

  it("lỗi khác P2002 → ném tiếp", async () => {
    vi.mocked(cardsRepo.findUserProduct).mockResolvedValue(null);
    vi.mocked(cardsRepo.createUserProduct).mockRejectedValue(new Error("db down"));
    await expect(
      cardService.createUserProduct("other", "プレイマット", "single")
    ).rejects.toThrow("db down");
  });
});

describe("userProductSetCode — quy ước setCode entry tự thêm", () => {
  it.each([
    ["other", "single", "OTHER"],
    ["other", "box", "OTHER-BOX"],
    ["pokemon", "single", "CUSTOM"],
    ["pokemon", "box", "CUSTOM-BOX"],
    ["onepiece", "single", "CUSTOM"],
  ])("(%s, %s) → %s", (game, category, expected) => {
    expect(cardsRepo.userProductSetCode(game, category)).toBe(expected);
  });
});

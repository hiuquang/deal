/**
 * Test card-service — find-or-create sản phẩm mục "その他" (game=other):
 * tái sử dụng entry trùng tên, tạo mới khi chưa có, và nhánh race P2002.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("@/server/repositories/cards", () => ({
  findOtherProduct: vi.fn(),
  createOtherProduct: vi.fn(),
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

describe("cardService.createOtherProduct", () => {
  it("tái sử dụng sản phẩm đã tồn tại cùng tên + category", async () => {
    vi.mocked(cardsRepo.findOtherProduct).mockResolvedValue(makeCard());
    const dto = await cardService.createOtherProduct("プレイマット", "single");
    expect(dto.id).toBe("card1");
    expect(dto.game).toBe("other");
    expect(cardsRepo.createOtherProduct).not.toHaveBeenCalled();
  });

  it("tạo mới khi chưa tồn tại", async () => {
    vi.mocked(cardsRepo.findOtherProduct).mockResolvedValue(null);
    vi.mocked(cardsRepo.createOtherProduct).mockResolvedValue(makeCard({ id: "new1" }));
    const dto = await cardService.createOtherProduct("プレイマット", "single");
    expect(cardsRepo.createOtherProduct).toHaveBeenCalledWith("プレイマット", "single");
    expect(dto.id).toBe("new1");
  });

  it("race 2 request cùng tạo → P2002 → trả về bản ghi thắng cuộc", async () => {
    vi.mocked(cardsRepo.findOtherProduct)
      .mockResolvedValueOnce(null) // check đầu: chưa có
      .mockResolvedValueOnce(makeCard({ id: "winner" })); // refetch sau P2002
    vi.mocked(cardsRepo.createOtherProduct).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "test",
      })
    );
    const dto = await cardService.createOtherProduct("プレイマット", "single");
    expect(dto.id).toBe("winner");
  });

  it("lỗi khác P2002 → ném tiếp", async () => {
    vi.mocked(cardsRepo.findOtherProduct).mockResolvedValue(null);
    vi.mocked(cardsRepo.createOtherProduct).mockRejectedValue(new Error("db down"));
    await expect(
      cardService.createOtherProduct("プレイマット", "single")
    ).rejects.toThrow("db down");
  });
});

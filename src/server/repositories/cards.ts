import { prisma } from "@/server/db";

export function searchCards(
  q: string | undefined,
  game: string | undefined,
  category?: string
) {
  return prisma.card.findMany({
    where: {
      ...(game ? { game } : {}),
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { nameJa: { contains: q } },
              { nameEn: { contains: q } },
              { setCode: { contains: q } },
              { cardNumber: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ game: "asc" }, { setCode: "asc" }, { cardNumber: "asc" }],
    take: 20,
  });
}

export function findCardById(id: string) {
  return prisma.card.findUnique({ where: { id } });
}

/** Tìm sản phẩm "other" theo tên chính xác (sau khi trim) + category. */
export function findOtherProduct(name: string, category: string) {
  return prisma.card.findFirst({
    where: { game: "other", category, nameJa: name },
  });
}

/**
 * Tạo sản phẩm "other" do user tự đặt tên. cardNumber = tên sản phẩm để
 * unique constraint (game, setCode, cardNumber, language) dedupe ở tầng DB;
 * setCode phân biệt theo category để cùng tên khác loại không đụng nhau.
 */
export function createOtherProduct(name: string, category: string) {
  return prisma.card.create({
    data: {
      game: "other",
      category,
      setCode: category === "box" ? "OTHER-BOX" : "OTHER",
      cardNumber: name,
      language: "JP",
      nameJa: name,
      nameEn: name,
      rarity: "-",
    },
  });
}

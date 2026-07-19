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

/**
 * setCode cho entry do user tự thêm: mục "other" giữ quy ước cũ OTHER/OTHER-BOX
 * (tương thích dữ liệu đã có); pokemon/onepiece dùng CUSTOM/CUSTOM-BOX — tách
 * hẳn khỏi catalog chuẩn để lọc/dọn được về sau.
 */
export function userProductSetCode(game: string, category: string): string {
  const base = game === "other" ? "OTHER" : "CUSTOM";
  return category === "box" ? `${base}-BOX` : base;
}

/** Tìm sản phẩm user tự thêm theo tên chính xác (sau khi trim) + game + category. */
export function findUserProduct(game: string, name: string, category: string) {
  return prisma.card.findFirst({
    where: { game, category, setCode: userProductSetCode(game, category), nameJa: name },
  });
}

/**
 * Tạo sản phẩm do user tự đặt tên. cardNumber = tên sản phẩm để unique
 * constraint (game, setCode, cardNumber, language) dedupe ở tầng DB;
 * setCode phân biệt theo game + category để không đụng nhau.
 */
export function createUserProduct(game: string, name: string, category: string) {
  return prisma.card.create({
    data: {
      game,
      category,
      setCode: userProductSetCode(game, category),
      cardNumber: name,
      language: "JP",
      nameJa: name,
      nameEn: name,
      rarity: "-",
    },
  });
}

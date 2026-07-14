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

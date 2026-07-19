import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";

export const buyOrderInclude = {
  card: true,
  buyer: { select: { id: true, displayName: true, isVip: true } },
  _count: { select: { offers: true } },
} satisfies Prisma.BuyOrderInclude;

export type BuyOrderWithRelations = Prisma.BuyOrderGetPayload<{
  include: typeof buyOrderInclude;
}>;

const PAGE_SIZE = 20;

export async function listBuyOrders(filter: {
  q?: string;
  game?: string;
  category?: string;
  cardId?: string;
  status?: string;
  buyerId?: string;
  page: number;
}) {
  const cardFilter: Prisma.CardWhereInput = {
    ...(filter.game ? { game: filter.game } : {}),
    ...(filter.category ? { category: filter.category } : {}),
    // Tìm theo thẻ liên kết (tên JP/EN, set, số thẻ) — cùng cách với listing.
    ...(filter.q
      ? {
          OR: [
            { nameJa: { contains: filter.q } },
            { nameEn: { contains: filter.q } },
            { setCode: { contains: filter.q } },
            { cardNumber: { contains: filter.q } },
          ],
        }
      : {}),
  };
  const where: Prisma.BuyOrderWhereInput = {
    ...(filter.cardId ? { cardId: filter.cardId } : {}),
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.buyerId ? { buyerId: filter.buyerId } : {}),
    ...(Object.keys(cardFilter).length ? { card: cardFilter } : {}),
  };
  const [buyOrders, total] = await Promise.all([
    prisma.buyOrder.findMany({
      where,
      include: buyOrderInclude,
      orderBy: { createdAt: "desc" },
      skip: (filter.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.buyOrder.count({ where }),
  ]);
  return { buyOrders, total };
}

export function findBuyOrderById(id: string) {
  return prisma.buyOrder.findUnique({ where: { id }, include: buyOrderInclude });
}

export function createBuyOrder(data: {
  buyerId: string;
  cardId: string;
  quantity: number;
  maxUnitPriceJpy: number | null;
}) {
  return prisma.buyOrder.create({ data, include: buyOrderInclude });
}

export function updateBuyOrderStatus(id: string, status: string) {
  return prisma.buyOrder.update({
    where: { id },
    data: { status },
    include: buyOrderInclude,
  });
}

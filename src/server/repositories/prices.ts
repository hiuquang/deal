import { prisma } from "@/server/db";

export function listPriceRecords(cardId: string, condition?: string) {
  return prisma.priceRecord.findMany({
    where: { cardId, ...(condition ? { condition } : {}) },
    orderBy: { tradedAt: "asc" },
    // Chỉ select các cột public — bảng vốn không có cột user, select tường minh
    // để không bao giờ lộ tradeId ra ngoài.
    select: {
      priceJpy: true,
      condition: true,
      reliability: true,
      flagged: true,
      tradedAt: true,
    },
  });
}

/** Giá của các record CHƯA bị flag cùng (card, condition) — nền so sánh outlier. */
export async function listUnflaggedPrices(cardId: string, condition: string) {
  const rows = await prisma.priceRecord.findMany({
    where: { cardId, condition, flagged: false },
    select: { priceJpy: true },
  });
  return rows.map((r) => r.priceJpy);
}

export function countPriceRecords(cardId?: string) {
  return prisma.priceRecord.count({
    where: cardId ? { cardId } : undefined,
  });
}

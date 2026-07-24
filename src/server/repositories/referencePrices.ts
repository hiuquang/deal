import { prisma } from "@/server/db";

/**
 * Giá tham khảo (nguồn ngoài) của 1 thẻ, cũ → mới. Select tường minh các cột
 * public — không lộ id nội bộ.
 */
export function listReferencePrices(cardId: string) {
  return prisma.referencePrice.findMany({
    where: { cardId },
    orderBy: { recordedAt: "asc" },
    select: {
      source: true,
      quantity: true,
      priceJpy: true,
      note: true,
      recordedAt: true,
    },
  });
}

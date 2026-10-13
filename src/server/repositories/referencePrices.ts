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
      kind: true,
      quantity: true,
      priceJpy: true,
      note: true,
      sourceUrl: true,
      recordedAt: true,
    },
  });
}

/**
 * Ghi 1 điểm giá tham khảo, idempotent theo khoá unique [cardId, source,
 * recordedAt] — y hệt hai script seed/import. Quét lại cùng một ngày thì cập
 * nhật chứ không sinh dòng trùng.
 */
export function upsertReferencePrice(input: {
  cardId: string;
  source: string;
  kind: string;
  quantity: number;
  priceJpy: number;
  sourceUrl?: string | null;
  recordedAt: Date;
}) {
  const { cardId, source, recordedAt, ...rest } = input;
  return prisma.referencePrice.upsert({
    where: { cardId_source_recordedAt: { cardId, source, recordedAt } },
    update: rest,
    create: { cardId, source, recordedAt, ...rest },
  });
}

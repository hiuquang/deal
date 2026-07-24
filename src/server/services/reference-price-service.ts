import { ApiError } from "@/server/errors";
import * as cards from "@/server/repositories/cards";
import * as referencePrices from "@/server/repositories/referencePrices";
import { computeStats } from "@/server/services/price-service";
import { toCardDto } from "@/server/serializers";
import type { CardDto, ReferencePriceDto, ReferencePriceStatsDto } from "@/lib/types";

/**
 * Trung bình có trọng số theo số lượng (¥/pack). Điểm giá bán nhiều pack ảnh
 * hưởng nhiều hơn — phản ánh mặt bằng giá thực hơn trung bình cộng đơn thuần.
 */
export function weightedAverage(rows: { priceJpy: number; quantity: number }[]): number | null {
  const totalQty = rows.reduce((s, r) => s + r.quantity, 0);
  if (totalQty <= 0) return null;
  const totalValue = rows.reduce((s, r) => s + r.priceJpy * r.quantity, 0);
  return Math.round(totalValue / totalQty);
}

/**
 * Giá tham khảo (nguồn ngoài) theo thẻ — KHÔNG gate give-to-get (mục đích là
 * tạo mặt bằng giá cho người mới xem, kể cả chưa đăng nhập). Trả kèm card để
 * trang hiển thị được ngay cả khi phần giá-giao-dịch-thật đang bị khóa.
 */
export async function getForCard(
  cardId: string
): Promise<{ card: CardDto; records: ReferencePriceDto[]; stats: ReferencePriceStatsDto }> {
  const card = await cards.findCardById(cardId);
  if (!card) {
    throw new ApiError(404, "NOT_FOUND", "Không tìm thấy thẻ.");
  }

  const rows = await referencePrices.listReferencePrices(cardId);
  const records: ReferencePriceDto[] = rows.map((row) => ({
    source: row.source,
    quantity: row.quantity,
    priceJpy: row.priceJpy,
    note: row.note,
    recordedAt: row.recordedAt.toISOString(),
  }));

  const base = computeStats(records.map((r) => r.priceJpy));
  const stats: ReferencePriceStatsDto = {
    ...base,
    weightedAvg: weightedAverage(records),
    totalQuantity: records.reduce((s, r) => s + r.quantity, 0),
  };

  return { card: toCardDto(card), records, stats };
}

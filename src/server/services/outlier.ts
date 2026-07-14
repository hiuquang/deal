// Phát hiện giá bất thường — module riêng để trade-service và price-service
// cùng dùng mà không tạo circular import.
import * as prices from "@/server/repositories/prices";

const OUTLIER_MIN_SAMPLES = 3;
const OUTLIER_DEVIATION = 0.5;

function median(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * Chống thông đồng bơm/dìm giá: cần ≥3 record chưa-flag cùng (card, condition)
 * làm nền so sánh; giá lệch >50% so với median của chúng → outlier.
 * Ít mẫu hơn → không đủ căn cứ, không flag.
 */
export function isOutlier(existingPricesJpy: number[], priceJpy: number): boolean {
  if (existingPricesJpy.length < OUTLIER_MIN_SAMPLES) return false;
  const m = median([...existingPricesJpy].sort((a, b) => a - b));
  if (m === null || m === 0) return false;
  return Math.abs(priceJpy - m) / m > OUTLIER_DEVIATION;
}

/** Cờ flagged cho price_record sắp tạo của 1 trade. */
export async function computeFlagForTrade(
  cardId: string,
  condition: string,
  priceJpy: number
): Promise<boolean> {
  const existing = await prices.listUnflaggedPrices(cardId, condition);
  return isOutlier(existing, priceJpy);
}

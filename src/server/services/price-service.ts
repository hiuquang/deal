import { ApiError } from "@/server/errors";
import * as cards from "@/server/repositories/cards";
import * as prices from "@/server/repositories/prices";
import * as users from "@/server/repositories/users";
import { autoCloseExpired } from "@/server/services/trade-service";
import { toCardDto } from "@/server/serializers";
import type { CardDto, Condition, PriceRecordDto, PriceStatsDto, Reliability } from "@/lib/types";

/**
 * Median của mảng đã sort tăng dần; n chẵn lấy trung bình 2 phần tử giữa.
 */
function median(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function computeStats(pricesJpy: number[]): PriceStatsDto {
  const sorted = [...pricesJpy].sort((a, b) => a - b);
  return {
    count: sorted.length,
    median: median(sorted),
    min: sorted.length ? sorted[0] : null,
    max: sorted.length ? sorted[sorted.length - 1] : null,
  };
}


/**
 * Dữ liệu giá theo thẻ — GATE give-to-get: user chưa đóng góp giao dịch nào
 * → 403 NEED_CONTRIBUTION kèm teaser (số record đang có) để tạo động lực.
 * Response KHÔNG BAO GIỜ chứa thông tin user (ẩn danh từ tầng schema).
 */
export async function getForCard(
  userId: string,
  cardId: string,
  condition?: string
): Promise<{ card: CardDto; records: PriceRecordDto[]; stats: PriceStatsDto }> {
  await autoCloseExpired();

  const card = await cards.findCardById(cardId);
  if (!card) {
    throw new ApiError(404, "NOT_FOUND", "カードが見つかりません。");
  }

  const contributionCount = await users.countContributions(userId);
  if (contributionCount < 1) {
    const teaserCount = await prices.countPriceRecords(cardId);
    throw new ApiError(
      403,
      "NEED_CONTRIBUTION",
      "相場データを見るには、まず1件の取引を成立させてデータを提供してください。",
      { recordCount: teaserCount }
    );
  }

  const rows = await prices.listPriceRecords(cardId, condition);
  const records: PriceRecordDto[] = rows.map((row) => ({
    priceJpy: row.priceJpy,
    condition: row.condition as Condition,
    reliability: row.reliability as Reliability,
    flagged: row.flagged,
    tradedAt: row.tradedAt.toISOString(),
  }));
  // Stats chỉ tính trên record chưa bị flag — outlier không được kéo lệch median.
  return {
    card: toCardDto(card),
    records,
    stats: computeStats(records.filter((r) => !r.flagged).map((r) => r.priceJpy)),
  };
}

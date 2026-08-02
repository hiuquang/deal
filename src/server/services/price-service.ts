import { ApiError } from "@/server/errors";
import * as cards from "@/server/repositories/cards";
import * as prices from "@/server/repositories/prices";
import * as users from "@/server/repositories/users";
import { autoCloseExpiredThrottled } from "@/server/services/trade-service";
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


export type PriceAccess = "empty" | "teaser" | "full";

/**
 * Quyền xem dữ liệu giá — hàm THUẦN để test được, đừng nhét truy vấn vào.
 *
 * - `empty`: thẻ chưa có giao dịch nào → **KHÔNG khóa**. Khóa một cái hộp rỗng
 *   vừa vô nghĩa vừa phản tác dụng: khách mới nhận đúng hai thông điệp "ở đây
 *   chẳng có gì" và "mà bạn cũng không được xem".
 * - `teaser`: có dữ liệu nhưng người xem chưa đóng góp (kể cả khách chưa đăng
 *   nhập) → cho xem SỐ LIỆU TỔNG (trung vị, khoảng giá), giấu từng giao dịch.
 *   Đủ chứng minh dữ liệu có thật mà vẫn giữ động lực give-to-get.
 * - `full`: đã đóng góp ≥1 giao dịch → xem tất cả.
 *
 * Nới từ v0.28.0 (trước đó chưa đóng góp = 403, khách vãng lai không xem được
 * gì): ở mốc gần 0 giao dịch, cổng cũ chặn đúng cái phễu nó sinh ra để nuôi —
 * người từ link group Facebook vào chỉ thấy ổ khóa rồi thoát.
 */
export function priceAccess(recordCount: number, contributionCount: number): PriceAccess {
  if (recordCount === 0) return "empty";
  return contributionCount >= 1 ? "full" : "teaser";
}

/**
 * Dữ liệu giá theo thẻ. `userId` null = khách chưa đăng nhập (endpoint công
 * khai). Response KHÔNG BAO GIỜ chứa thông tin user (ẩn danh từ tầng schema).
 */
export async function getForCard(
  userId: string | null,
  cardId: string,
  condition?: string
): Promise<{
  card: CardDto;
  records: PriceRecordDto[];
  stats: PriceStatsDto;
  locked: boolean;
  /** Tổng số giao dịch của thẻ (MỌI condition) — dùng cho lời mời đóng góp. */
  recordCount: number;
}> {
  await autoCloseExpiredThrottled();

  const card = await cards.findCardById(cardId);
  if (!card) {
    throw new ApiError(404, "NOT_FOUND", "Không tìm thấy thẻ.");
  }

  const recordCount = await prices.countPriceRecords(cardId);
  const contributionCount = userId ? await users.countContributions(userId) : 0;
  const access = priceAccess(recordCount, contributionCount);

  const rows = access === "empty" ? [] : await prices.listPriceRecords(cardId, condition);
  const records: PriceRecordDto[] = rows.map((row) => ({
    priceJpy: row.priceJpy,
    condition: row.condition as Condition,
    reliability: row.reliability as Reliability,
    flagged: row.flagged,
    tradedAt: row.tradedAt.toISOString(),
  }));
  // Stats chỉ tính trên record chưa bị flag — outlier không được kéo lệch median.
  // Tính trên TOÀN BỘ rows kể cả ở chế độ teaser: số liệu tổng là thứ được cho
  // xem, chỉ danh sách từng giao dịch mới bị giấu.
  return {
    card: toCardDto(card),
    records: access === "full" ? records : [],
    stats: computeStats(records.filter((r) => !r.flagged).map((r) => r.priceJpy)),
    locked: access === "teaser",
    recordCount,
  };
}

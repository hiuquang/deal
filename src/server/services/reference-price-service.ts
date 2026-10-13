import { ApiError } from "@/server/errors";
import * as cards from "@/server/repositories/cards";
import * as referencePrices from "@/server/repositories/referencePrices";
import { computeStats } from "@/server/services/price-service";
import { toCardDto } from "@/server/serializers";
import type {
  CardDto,
  ReferenceGroupDto,
  ReferenceKind,
  ReferencePriceDto,
  ReferencePriceStatsDto,
} from "@/lib/types";

/**
 * Thứ tự hiển thị: sàn → thật → trần. 買取 là giá shop thu vào (thấp nhất,
 * chắc chắn lấy được ngay), rồi tới giá đã bán, trên cùng là giá đang rao.
 * Đúng thứ tự này thì người đọc thấy ngay khoảng thương lượng của mình.
 */
const KIND_ORDER: ReferenceKind[] = ["kaitori", "ban", "rao"];

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
export function statsFor(records: ReferencePriceDto[]): ReferencePriceStatsDto {
  return {
    ...computeStats(records.map((r) => r.priceJpy)),
    weightedAvg: weightedAverage(records),
    totalQuantity: records.reduce((s, r) => s + r.quantity, 0),
  };
}

export async function getForCard(
  cardId: string
): Promise<{ card: CardDto; groups: ReferenceGroupDto[] }> {
  const card = await cards.findCardById(cardId);
  if (!card) {
    throw new ApiError(404, "NOT_FOUND", "Không tìm thấy thẻ.");
  }

  const rows = await referencePrices.listReferencePrices(cardId);
  const records: ReferencePriceDto[] = rows.map((row) => ({
    source: row.source,
    kind: (KIND_ORDER as string[]).includes(row.kind)
      ? (row.kind as ReferenceKind)
      : // Giá trị lạ trong DB (nhập tay sai…) rơi về "rao" thay vì biến mất:
        // mất dữ liệu trong im lặng khó phát hiện hơn nhiều so với xếp nhầm ô.
        "rao",
    quantity: row.quantity,
    priceJpy: row.priceJpy,
    note: row.note,
    sourceUrl: row.sourceUrl,
    recordedAt: row.recordedAt.toISOString(),
  }));

  // TÁCH theo loại, KHÔNG gộp thành một trung bình. Trộn giá shop thu vào với
  // giá rao cho ra con số không có nghĩa gì mà nhìn vẫn như thật — đây là lỗi
  // tồn tại từ v0.21.0 tới v0.31.0, nhãn `source` chỉ để hiển thị chứ không
  // tách thống kê. Sửa ở v0.32.0.
  const groups: ReferenceGroupDto[] = KIND_ORDER.map((kind) => {
    const inKind = records.filter((r) => r.kind === kind);
    return { kind, records: inKind, stats: statsFor(inKind) };
  }).filter((g) => g.records.length > 0);

  return { card: toCardDto(card), groups };
}

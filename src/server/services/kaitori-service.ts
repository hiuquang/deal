/**
 * Thu thập giá 買取 (giá shop THU VÀO) từ X qua Grok.
 *
 * Luồng cố ý tách làm HAI bước, không gộp:
 *   1. `scan()`  — Grok quét X, trả ĐỀ XUẤT. **Không ghi gì vào DB.**
 *   2. `importApproved()` — chủ web duyệt từng dòng, gắn đúng thẻ trong
 *      catalog, rồi mới lưu.
 *
 * Gộp hai bước lại là mời output của một mô hình ngôn ngữ đi thẳng vào dataset
 * giá — đúng thứ cả dự án tồn tại để xây. Xem thêm chú thích ở `server/xai.ts`.
 */
import { ApiError } from "@/server/errors";
import * as cards from "@/server/repositories/cards";
import * as referencePrices from "@/server/repositories/referencePrices";
import { searchKaitori, type KaitoriCandidate } from "@/server/xai";

/** Nhãn `kind` của giá 買取 trong bảng reference_prices. */
export const KAITORI_KIND = "kaitori";

/**
 * Các shop thẻ bài Nhật đăng bảng giá 買取 đều đặn trên X. Để trong code chứ
 * không phải env: đây là tri thức về thị trường, sửa thì sửa kèm review, chứ
 * không phải thứ đổi theo môi trường triển khai.
 *
 * ⚠️ Sửa 2026-10-21: v0.32.0 ghi `yuyu_tei`, `hareruya2_TCG`, `cardlabo_` — đối
 * chiếu với trang chính thức thì KHÔNG phải tài khoản shop trỏ tới. Đã thay
 * bằng handle lấy từ link trên site của chính shop. Hai dòng còn lại CHƯA
 * kiểm được (xem docs/kaitori.md, mục "chờ kiểm tay").
 */
export const DEFAULT_SHOP_HANDLES = [
  "yuyuteiNews", // yuyu-tei.jp, chân trang
  "hareruya2pokeca", // hareruya2.com, "ハレツーX"
  "cardlabo_info", // c-labo.jp, đầu trang
  "cardrush_pokemon", // chưa kiểm
  "FullaheadTcg", // chưa kiểm
];

/** Trần số ngày quét ngược — quét rộng là tốn tiền API mà dữ liệu cũ vô dụng. */
const MAX_DAYS = 14;
/** Trần số handle mỗi lượt; xAI cho tối đa 20 cho `allowed_x_handles`. */
const MAX_HANDLES = 20;

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function scan(input: {
  handles?: string[];
  days?: number;
}): Promise<{ items: KaitoriCandidate[]; postsFetched: number; fromDate: string; toDate: string }> {
  const handles = (input.handles?.length ? input.handles : DEFAULT_SHOP_HANDLES)
    .map((h) => h.trim().replace(/^@/, ""))
    .filter(Boolean)
    .slice(0, MAX_HANDLES);
  if (handles.length === 0) {
    throw new ApiError(400, "NO_HANDLES", "Cần ít nhất một tài khoản X để quét.");
  }

  const days = Math.min(Math.max(input.days ?? 3, 1), MAX_DAYS);
  const now = new Date();
  const from = new Date(now.getTime() - days * 86_400_000);
  // `to_date` của xAI là mốc LOẠI TRỪ → cộng 1 ngày, nếu không bài hôm nay bị bỏ.
  const to = new Date(now.getTime() + 86_400_000);

  const result = await searchKaitori({
    handles,
    fromDate: toIsoDate(from),
    toDate: toIsoDate(to),
  });
  return { ...result, fromDate: toIsoDate(from), toDate: toIsoDate(now) };
}

export interface ApprovedRow {
  /** Thẻ trong catalog do CHỦ WEB chọn — không phải do Grok đoán. */
  cardId: string;
  priceJpy: number;
  shop: string;
  postedOn: string;
  sourceUrl?: string | null;
}

export async function importApproved(rows: ApprovedRow[]): Promise<{ saved: number }> {
  if (rows.length === 0) {
    throw new ApiError(400, "NOTHING_TO_SAVE", "Chưa chọn dòng nào để lưu.");
  }

  let saved = 0;
  for (const row of rows) {
    const card = await cards.findCardById(row.cardId);
    if (!card) {
      throw new ApiError(404, "CARD_NOT_FOUND", `Không tìm thấy thẻ ${row.cardId}.`);
    }
    // Mốc giờ: 12:00 JST của ngày đăng. Bảng giá 買取 áp cho cả ngày chứ không
    // theo phút, mà lấy 00:00 thì đổi múi giờ là rơi sang ngày hôm trước.
    const recordedAt = new Date(`${row.postedOn}T12:00:00+09:00`);
    if (Number.isNaN(recordedAt.getTime())) {
      throw new ApiError(400, "BAD_DATE", `Ngày không hợp lệ: ${row.postedOn}`);
    }

    await referencePrices.upsertReferencePrice({
      cardId: row.cardId,
      source: row.shop,
      kind: KAITORI_KIND,
      // 買取 là giá cho MỘT bản, shop thu bao nhiêu cũng cùng giá → luôn 1.
      // (quantity ở bảng này vốn là trọng số cho giá rao theo lô.)
      quantity: 1,
      priceJpy: row.priceJpy,
      sourceUrl: row.sourceUrl ?? null,
      recordedAt,
    });
    saved++;
  }

  console.log(`[kaitori] đã lưu ${saved} điểm giá 買取`);
  return { saved };
}

import { ApiError } from "@/server/errors";
import * as cards from "@/server/repositories/cards";
import * as listings from "@/server/repositories/listings";
import * as tradesRepo from "@/server/repositories/trades";
import { toListingDto } from "@/server/serializers";
import { assertConditionMatchesCategory } from "@/server/validation";
import type { ListingDto } from "@/lib/types";

export async function list(filter: {
  q?: string;
  game?: string;
  category?: string;
  cardId?: string;
  status?: string;
  sellerId?: string;
  page: number;
}): Promise<{ listings: ListingDto[]; total: number }> {
  const { listings: rows, total } = await listings.listListings(filter);
  return { listings: rows.map(toListingDto), total };
}

export async function create(
  sellerId: string,
  input: {
    cardId: string;
    condition: string;
    imageUrl: string;
    askingPriceJpy?: number | null;
    quantity: number;
    tradeType: string;
    station?: string | null;
    note?: string | null;
  }
): Promise<ListingDto> {
  const card = await cards.findCardById(input.cardId);
  if (!card) {
    throw new ApiError(404, "CARD_NOT_FOUND", "Không tìm thấy thẻ đã chọn.");
  }
  assertConditionMatchesCategory(card.category, input.condition);
  const listing = await listings.createListing({
    sellerId,
    cardId: input.cardId,
    condition: input.condition,
    imageUrl: input.imageUrl,
    askingPriceJpy: input.askingPriceJpy ?? null,
    quantity: input.quantity,
    tradeType: input.tradeType,
    station: input.station?.trim() || null,
    note: input.note ?? null,
  });
  console.log(`[listing] created ${listing.id} by ${sellerId} (card ${card.id})`);
  return toListingDto(listing);
}

export async function getById(id: string): Promise<ListingDto> {
  const listing = await listings.findListingById(id);
  if (!listing) {
    throw new ApiError(404, "NOT_FOUND", "Không tìm thấy tin đăng.");
  }
  return toListingDto(listing);
}

/**
 * Guard chung cho 2 thao tác kết thúc tin của chủ (gỡ tin = cancelled, đánh
 * dấu đã bán = closed): chỉ chủ tin, tin chưa kết thúc, và chặn khi còn trade
 * đang thương lượng (pending) — tin giữ active suốt quá trình trade nên không
 * dựa vào trạng thái in_trade cũ. Trade đã chốt chờ đánh giá thì cho qua.
 *
 * Chỉ chặn theo trạng thái ĐÃ KẾT THÚC (`closed`/`cancelled`), KHÔNG phải
 * `!== "active"`: hàng `in_trade` legacy (không còn được gán từ v0.19.0, cũng
 * không có code nào đưa nó ra) sẽ kẹt vĩnh viễn — vừa vô hình trên chợ (chợ chỉ
 * lấy active) vừa không cho chủ tin đóng hay gỡ. Đã dính đúng ca này với 1 tin
 * thật ngày 2026-07-30.
 */
const TRANG_THAI_DA_KET_THUC = ["closed", "cancelled"];

async function assertOwnerCanEnd(userId: string, id: string) {
  const listing = await listings.findListingById(id);
  if (!listing) {
    throw new ApiError(404, "NOT_FOUND", "Không tìm thấy tin đăng.");
  }
  if (listing.sellerId !== userId) {
    throw new ApiError(403, "FORBIDDEN", "Bạn chỉ thao tác được trên tin đăng của mình.");
  }
  if (TRANG_THAI_DA_KET_THUC.includes(listing.status)) {
    throw new ApiError(409, "INVALID_STATUS", "Tin đăng này đã kết thúc.");
  }
  const pending = await tradesRepo.findPendingTradeByListing(id);
  if (pending) {
    throw new ApiError(409, "IN_TRADE", "Không thể kết thúc tin khi đang có giao dịch dang dở.");
  }
}

export async function cancel(userId: string, id: string): Promise<ListingDto> {
  await assertOwnerCanEnd(userId, id);
  const updated = await listings.updateListingStatus(id, "cancelled");
  console.log(`[listing] cancelled ${id} by ${userId}`);
  return toListingDto(updated);
}

/** Chủ tin tự đánh dấu ĐÃ BÁN → đóng tin (closed). Khác cancel ở ngữ nghĩa
 *  (đã giao dịch xong thay vì gỡ bỏ) nhưng cùng guard. Không đụng price_records. */
export async function markSold(userId: string, id: string): Promise<ListingDto> {
  await assertOwnerCanEnd(userId, id);
  const updated = await listings.updateListingStatus(id, "closed");
  console.log(`[listing] marked sold (closed) ${id} by ${userId}`);
  return toListingDto(updated);
}

// Chủ tin sửa giá chào (要相談 nếu null). Chỉ tin đang bán (active) — tin đang
// giao dịch/đã kết thúc khóa giá. Không đụng price_records (giá thị trường).
export async function updatePrice(
  userId: string,
  id: string,
  askingPriceJpy: number | null
): Promise<ListingDto> {
  const listing = await listings.findListingById(id);
  if (!listing) {
    throw new ApiError(404, "NOT_FOUND", "Không tìm thấy tin đăng.");
  }
  if (listing.sellerId !== userId) {
    throw new ApiError(403, "FORBIDDEN", "Bạn chỉ thao tác được trên tin đăng của mình.");
  }
  if (listing.status !== "active") {
    throw new ApiError(409, "INVALID_STATUS", "Chỉ đổi được giá cho tin đang bán.");
  }
  const updated = await listings.updateListingAskingPrice(id, askingPriceJpy);
  console.log(`[listing] price updated ${id} by ${userId} -> ${askingPriceJpy ?? "negotiable"}`);
  return toListingDto(updated);
}

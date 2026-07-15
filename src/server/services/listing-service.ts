import { ApiError } from "@/server/errors";
import * as cards from "@/server/repositories/cards";
import * as listings from "@/server/repositories/listings";
import { toListingDto } from "@/server/serializers";
import { BOX_CONDITIONS } from "@/server/validation";
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
    tradeType: string;
    station?: string | null;
    note?: string | null;
  }
): Promise<ListingDto> {
  const card = await cards.findCardById(input.cardId);
  if (!card) {
    throw new ApiError(404, "CARD_NOT_FOUND", "指定されたカードが見つかりません。");
  }
  // Condition phải khớp loại sản phẩm — dữ liệu giá sẽ noisy nếu box dùng
  // condition của thẻ lẻ (và ngược lại).
  const isBoxCondition = (BOX_CONDITIONS as readonly string[]).includes(input.condition);
  if ((card.category === "box") !== isBoxCondition) {
    throw new ApiError(
      400,
      "CONDITION_MISMATCH",
      card.category === "box"
        ? "BOXにはシュリンク付き/なしの状態を選択してください。"
        : "シングルカードにはカード用の状態を選択してください。"
    );
  }
  const listing = await listings.createListing({
    sellerId,
    cardId: input.cardId,
    condition: input.condition,
    imageUrl: input.imageUrl,
    askingPriceJpy: input.askingPriceJpy ?? null,
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
    throw new ApiError(404, "NOT_FOUND", "出品が見つかりません。");
  }
  return toListingDto(listing);
}

export async function cancel(userId: string, id: string): Promise<ListingDto> {
  const listing = await listings.findListingById(id);
  if (!listing) {
    throw new ApiError(404, "NOT_FOUND", "出品が見つかりません。");
  }
  if (listing.sellerId !== userId) {
    throw new ApiError(403, "FORBIDDEN", "自分の出品のみ操作できます。");
  }
  if (listing.status === "in_trade") {
    throw new ApiError(409, "IN_TRADE", "取引進行中の出品はキャンセルできません。");
  }
  if (listing.status !== "active") {
    throw new ApiError(409, "INVALID_STATUS", "この出品は既に終了しています。");
  }
  const updated = await listings.updateListingStatus(id, "cancelled");
  console.log(`[listing] cancelled ${id} by ${userId}`);
  return toListingDto(updated);
}

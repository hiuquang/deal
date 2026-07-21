import { ApiError } from "@/server/errors";
import * as favoritesRepo from "@/server/repositories/favorites";
import * as listingsRepo from "@/server/repositories/listings";
import * as buyOrdersRepo from "@/server/repositories/buy-orders";
import type { FavoriteIdsDto, FavoriteKind, SavedItemDto } from "@/lib/types";

/**
 * Tin đã lưu (❤️). Lưu được cả listing lẫn buy-order. Trang cá nhân hiện danh
 * sách đã lưu; tin đã gỡ/bán/hủy (status != active) hoặc bị xóa cứng → đánh dấu
 * `available=false` để UI báo "không còn" (vẫn giữ bản lưu tới khi user tự bỏ).
 */

async function assertListingExists(listingId: string) {
  const listing = await listingsRepo.findListingById(listingId);
  if (!listing) throw new ApiError(404, "NOT_FOUND", "出品が見つかりません。");
}

async function assertBuyOrderExists(buyOrderId: string) {
  const order = await buyOrdersRepo.findBuyOrderById(buyOrderId);
  if (!order) throw new ApiError(404, "NOT_FOUND", "まとめ買いが見つかりません。");
}

/** Bật/tắt lưu. Trả trạng thái mới (`favorited`). Idempotent theo hướng. */
export async function toggle(
  userId: string,
  kind: FavoriteKind,
  targetId: string,
  favorited: boolean
): Promise<{ favorited: boolean }> {
  if (kind === "listing") {
    if (favorited) {
      await assertListingExists(targetId);
      await favoritesRepo.addListing(userId, targetId);
    } else {
      await favoritesRepo.removeListing(userId, targetId);
    }
  } else {
    if (favorited) {
      await assertBuyOrderExists(targetId);
      await favoritesRepo.addBuyOrder(userId, targetId);
    } else {
      await favoritesRepo.removeBuyOrder(userId, targetId);
    }
  }
  return { favorited };
}

export function listIds(userId: string): Promise<FavoriteIdsDto> {
  return favoritesRepo.listSavedIds(userId);
}

export async function listSaved(userId: string): Promise<SavedItemDto[]> {
  const rows = await favoritesRepo.listSaved(userId);
  return rows.map((row): SavedItemDto => {
    if (row.listing) {
      return {
        kind: "listing",
        targetId: row.listing.id,
        cardNameJa: row.listing.card.nameJa,
        imageUrl: row.listing.imageUrl,
        priceJpy: row.listing.askingPriceJpy,
        available: row.listing.status === "active",
        savedAt: row.createdAt.toISOString(),
      };
    }
    if (row.buyOrder) {
      return {
        kind: "buy_order",
        targetId: row.buyOrder.id,
        cardNameJa: row.buyOrder.card.nameJa,
        imageUrl: null,
        priceJpy: row.buyOrder.maxUnitPriceJpy,
        available: row.buyOrder.status === "active",
        savedAt: row.createdAt.toISOString(),
      };
    }
    // Cả hai FK null = tin đã bị xóa cứng (cascade dọn quan hệ) → mục mồ côi.
    return {
      kind: row.buyOrderId ? "buy_order" : "listing",
      targetId: null,
      cardNameJa: null,
      imageUrl: null,
      priceJpy: null,
      available: false,
      savedAt: row.createdAt.toISOString(),
    };
  });
}

import { prisma } from "@/server/db";
import { listingInclude } from "@/server/repositories/listings";

/** Tin đã lưu (❤️): thao tác lưu/bỏ lưu + đọc cho trang cá nhân và tô tim. */

/** Lưu 1 listing (idempotent — đã lưu thì thôi, không lỗi). */
export function addListing(userId: string, listingId: string) {
  return prisma.favorite.upsert({
    where: { userId_listingId: { userId, listingId } },
    update: {},
    create: { userId, listingId },
  });
}

export function removeListing(userId: string, listingId: string) {
  return prisma.favorite.deleteMany({ where: { userId, listingId } });
}

export function addBuyOrder(userId: string, buyOrderId: string) {
  return prisma.favorite.upsert({
    where: { userId_buyOrderId: { userId, buyOrderId } },
    update: {},
    create: { userId, buyOrderId },
  });
}

export function removeBuyOrder(userId: string, buyOrderId: string) {
  return prisma.favorite.deleteMany({ where: { userId, buyOrderId } });
}

export function isListingSaved(userId: string, listingId: string) {
  return prisma.favorite.findUnique({
    where: { userId_listingId: { userId, listingId } },
  });
}

export function isBuyOrderSaved(userId: string, buyOrderId: string) {
  return prisma.favorite.findUnique({
    where: { userId_buyOrderId: { userId, buyOrderId } },
  });
}

/** Tập id đã lưu (chỉ id, nhẹ) — tô tim trên thẻ. */
export async function listSavedIds(
  userId: string
): Promise<{ listingIds: string[]; buyOrderIds: string[] }> {
  const rows = await prisma.favorite.findMany({
    where: { userId },
    select: { listingId: true, buyOrderId: true },
  });
  return {
    listingIds: rows.map((r) => r.listingId).filter((v): v is string => v !== null),
    buyOrderIds: rows.map((r) => r.buyOrderId).filter((v): v is string => v !== null),
  };
}

/** Danh sách đã lưu đầy đủ (kèm listing/buyOrder + card) cho trang cá nhân. */
export function listSaved(userId: string) {
  return prisma.favorite.findMany({
    where: { userId },
    include: {
      listing: { include: listingInclude },
      buyOrder: { include: { card: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

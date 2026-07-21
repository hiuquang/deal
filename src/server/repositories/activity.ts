import { prisma } from "@/server/db";

/**
 * Truy vấn "hoạt động trên tin của tôi" cho mục thông báo ở trang cá nhân:
 * bình luận vào tin mình đăng, 購入希望 đang chờ, chào bán đang chờ trên tin
 * gom của mình. Tất cả derived — không có bảng notification riêng (cùng triết
 * lý trust system: suy từ dữ liệu gốc, không sync 2 nguồn).
 */

const ACTOR_SELECT = { select: { id: true, displayName: true, isVip: true } };

/** Bình luận của NGƯỜI KHÁC vào tin mình đăng, mới nhất trước. */
export function listCommentsOnMyListings(userId: string, limit = 20) {
  return prisma.comment.findMany({
    where: { listing: { sellerId: userId }, userId: { not: userId } },
    include: {
      user: ACTOR_SELECT,
      listing: { select: { id: true, card: { select: { nameJa: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/** 購入希望 đang chờ (pending) trên tin mình đăng. */
export function listPendingRequestsForMyListings(userId: string) {
  return prisma.purchaseRequest.findMany({
    where: { status: "pending", listing: { sellerId: userId } },
    include: {
      buyer: ACTOR_SELECT,
      listing: { select: { id: true, card: { select: { nameJa: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Chào bán đang chờ (pending) trên tin gom của mình. */
export function listPendingOffersForMyBuyOrders(userId: string) {
  return prisma.buyOrderOffer.findMany({
    where: { status: "pending", buyOrder: { buyerId: userId } },
    include: {
      seller: ACTOR_SELECT,
      buyOrder: { select: { id: true, card: { select: { nameJa: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Đếm item mới hơn mốc `since` cho badge ở nav — 3 câu count gọn thay vì kéo
 * cả danh sách (endpoint này bị nav poll định kỳ).
 */
export async function countNewActivity(userId: string, since: Date): Promise<number> {
  const [comments, requests, offers] = await Promise.all([
    prisma.comment.count({
      where: {
        listing: { sellerId: userId },
        userId: { not: userId },
        createdAt: { gt: since },
      },
    }),
    prisma.purchaseRequest.count({
      where: { status: "pending", listing: { sellerId: userId }, createdAt: { gt: since } },
    }),
    prisma.buyOrderOffer.count({
      where: { status: "pending", buyOrder: { buyerId: userId }, createdAt: { gt: since } },
    }),
  ]);
  return comments + requests + offers;
}

/** Ghi mốc "đã xem hoạt động" = now (gọi khi mở trang cá nhân). */
export function setActivitySeen(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { activitySeenAt: new Date() },
  });
}

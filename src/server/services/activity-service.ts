import * as activityRepo from "@/server/repositories/activity";
import type { ActivityDto, ActivityItemDto } from "@/lib/types";
import type { User } from "@prisma/client";

/**
 * Mục "hoạt động trên tin của tôi" ở trang cá nhân + badge ở nav.
 *
 * Ngữ nghĩa "mới": item sinh ra SAU mốc user.activitySeenAt (chưa xem lần nào
 * → mọi item đều mới). Mở trang cá nhân là markSeen → badge về 0, nhưng danh
 * sách vẫn giữ nguyên (購入希望/chào bán pending nằm đó tới khi chủ tin 連携).
 */

/** Mốc so "mới": chưa xem lần nào thì lấy epoch — mọi thứ đều mới. */
function seenAt(user: User): Date {
  return user.activitySeenAt ?? new Date(0);
}

export async function getActivity(user: User): Promise<ActivityDto> {
  const [comments, requests, offers] = await Promise.all([
    activityRepo.listCommentsOnMyListings(user.id),
    activityRepo.listPendingRequestsForMyListings(user.id),
    activityRepo.listPendingOffersForMyBuyOrders(user.id),
  ]);
  const since = seenAt(user).getTime();

  const items: ActivityItemDto[] = [
    ...comments.map((c): ActivityItemDto => {
      // Bình luận gắn tin bán HOẶC tin đăng mua — repo lọc theo đúng 1 trong 2
      // nên luôn có một nhánh khác null.
      const on = c.listing ?? c.buyOrder!;
      return {
        kind: "comment",
        targetKind: c.listing ? "listing" : "buy_order",
        targetId: on.id,
        cardNameJa: on.card.nameJa,
        actorName: c.user.displayName,
        actorIsVip: c.user.isVip,
        body: c.body,
        quantity: null,
        isNew: c.createdAt.getTime() > since,
        createdAt: c.createdAt.toISOString(),
      };
    }),
    ...requests.map(
      (r): ActivityItemDto => ({
        kind: "request",
        targetKind: "listing",
        targetId: r.listing.id,
        cardNameJa: r.listing.card.nameJa,
        actorName: r.buyer.displayName,
        actorIsVip: r.buyer.isVip,
        body: null,
        quantity: null,
        isNew: r.createdAt.getTime() > since,
        createdAt: r.createdAt.toISOString(),
      })
    ),
    ...offers.map(
      (o): ActivityItemDto => ({
        kind: "offer",
        targetKind: "buy_order",
        targetId: o.buyOrder.id,
        cardNameJa: o.buyOrder.card.nameJa,
        actorName: o.seller.displayName,
        actorIsVip: o.seller.isVip,
        body: null,
        quantity: o.quantity,
        isNew: o.createdAt.getTime() > since,
        createdAt: o.createdAt.toISOString(),
      })
    ),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { items, newCount: items.filter((i) => i.isNew).length };
}

/** Số item mới cho badge ở nav — 3 câu count, không kéo danh sách. */
export function countNew(user: User): Promise<number> {
  return activityRepo.countNewActivity(user.id, seenAt(user));
}

/** Mở trang cá nhân → coi như đã xem hết (badge về 0). */
export async function markSeen(userId: string): Promise<void> {
  await activityRepo.setActivitySeen(userId);
}

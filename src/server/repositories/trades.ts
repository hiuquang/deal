import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";

// KHÔNG join listing: mọi dữ liệu trade cần (card/condition/quantity) đã
// denormalize trên trades từ P9; listingId (cột) đủ cho khóa/mở listing.
export const tradeInclude = {
  card: true,
  buyer: { select: { id: true, displayName: true, isVip: true } },
  seller: { select: { id: true, displayName: true, isVip: true } },
} satisfies Prisma.TradeInclude;

export type TradeWithRelations = Prisma.TradeGetPayload<{
  include: typeof tradeInclude;
}>;

export function findTradeById(id: string) {
  return prisma.trade.findUnique({ where: { id }, include: tradeInclude });
}

/** Trade "còn sống" (chưa cancelled) trên 1 listing — dùng chặn TRADE_EXISTS. */
export function findActiveTradeByListing(listingId: string) {
  return prisma.trade.findFirst({
    where: { listingId, status: { not: "cancelled" } },
  });
}

/** Trade đang thương lượng (pending) trên 1 listing — dùng chặn hủy tin
 *  khi đang có giao dịch dang dở (tin giữ active suốt quá trình trade). */
export function findPendingTradeByListing(listingId: string) {
  return prisma.trade.findFirst({ where: { listingId, status: "pending" } });
}

export function listTradesForUser(userId: string) {
  return prisma.trade.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    include: tradeInclude,
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Tạo trade. Tin đăng KHÔNG bị khóa (in_trade) nữa — giữ nguyên active để
 * vẫn hiện trên bảng + nhận thêm 購入希望 từ người khác trong lúc thương
 * lượng; tin chỉ đóng khi giao dịch chốt giá XONG và cả 2 đã đánh giá
 * (xem rating-service). "1 trade active/listing" vẫn được index DB đảm bảo.
 */
export function createTrade(data: {
  listingId?: string | null;
  buyOrderId?: string | null;
  conversationId: string;
  sellerId: string;
  buyerId: string;
  initiatorId: string;
  cardId: string;
  condition: string;
  quantity: number;
  finalPriceJpy: number; // với buy-order là ĐƠN GIÁ (giá/1 bản)
  autoCloseAt: Date;
}) {
  return prisma.trade.create({
    data: { ...data, status: "pending" },
    include: tradeInclude,
  });
}

/**
 * Chốt trade (confirmed hoặc self_reported): cập nhật trạng thái + tạo
 * price_record đúng 1 lần, trong 1 transaction. KHÔNG đóng listing ở đây —
 * tin chỉ đóng sau khi cả 2 đánh giá xong (rating-service). Trade từ
 * buy-order cũng không đụng tin gom (chủ tự gỡ khi đủ).
 */
export function closeTrade(
  tradeId: string,
  outcome: "confirmed" | "self_reported",
  record: {
    cardId: string;
    condition: string;
    priceJpy: number;
    tradedAt: Date;
    flagged: boolean;
  }
) {
  return prisma.$transaction(async (tx) => {
    const trade = await tx.trade.update({
      where: { id: tradeId },
      data: {
        status: outcome,
        confirmedAt: outcome === "confirmed" ? new Date() : null,
      },
      include: tradeInclude,
    });
    await tx.priceRecord.create({
      data: {
        tradeId,
        cardId: record.cardId,
        condition: record.condition,
        priceJpy: record.priceJpy,
        reliability: outcome,
        flagged: record.flagged,
        tradedAt: record.tradedAt,
      },
    });
    return trade;
  });
}

/** Hủy trade pending. Không đụng trạng thái listing — tin vốn giữ active
 *  suốt quá trình trade nên không cần mở lại. */
export function cancelTrade(tradeId: string) {
  return prisma.trade.update({
    where: { id: tradeId },
    data: { status: "cancelled" },
    include: tradeInclude,
  });
}

export function listExpiredPendingTrades(now: Date) {
  return prisma.trade.findMany({
    where: { status: "pending", autoCloseAt: { lte: now } },
    include: tradeInclude,
  });
}

const CLOSED = { in: ["confirmed", "self_reported"] };

/**
 * Thống kê giao dịch cho hồ sơ công khai: số trade đã chốt, số trade đã hủy,
 * số ĐỐI TÁC KHÁC NHAU (distinct — chống bơm chỉ số bằng cách trade lặp với
 * 1 đồng bọn), số trade đã chốt trong vai người bán (badge Top Seller).
 */
export async function getTradeStatsForUser(userId: string): Promise<{
  closedTrades: number;
  cancelledTrades: number;
  distinctPartners: number;
  closedAsSeller: number;
}> {
  const [closedTrades, cancelledTrades, closedAsSeller, asBuyer, asSeller] =
    await Promise.all([
      prisma.trade.count({
        where: { status: CLOSED, OR: [{ buyerId: userId }, { sellerId: userId }] },
      }),
      prisma.trade.count({
        where: { status: "cancelled", OR: [{ buyerId: userId }, { sellerId: userId }] },
      }),
      prisma.trade.count({ where: { status: CLOSED, sellerId: userId } }),
      prisma.trade.findMany({
        where: { status: CLOSED, buyerId: userId },
        select: { sellerId: true },
        distinct: ["sellerId"],
      }),
      prisma.trade.findMany({
        where: { status: CLOSED, sellerId: userId },
        select: { buyerId: true },
        distinct: ["buyerId"],
      }),
    ]);
  const partners = new Set<string>([
    ...asBuyer.map((t) => t.sellerId),
    ...asSeller.map((t) => t.buyerId),
  ]);
  return { closedTrades, cancelledTrades, distinctPartners: partners.size, closedAsSeller };
}

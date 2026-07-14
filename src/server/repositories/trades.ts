import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";
import { listingInclude } from "@/server/repositories/listings";

export const tradeInclude = {
  listing: { include: listingInclude },
  buyer: { select: { id: true, displayName: true } },
  seller: { select: { id: true, displayName: true } },
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

export function listTradesForUser(userId: string) {
  return prisma.trade.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    include: tradeInclude,
    orderBy: { createdAt: "desc" },
  });
}

/** Tạo trade + chuyển listing sang in_trade trong 1 transaction. */
export function createTradeWithListingLock(data: {
  listingId: string;
  conversationId: string;
  sellerId: string;
  buyerId: string;
  initiatorId: string;
  finalPriceJpy: number;
  autoCloseAt: Date;
}) {
  return prisma.$transaction(async (tx) => {
    const trade = await tx.trade.create({
      data: { ...data, status: "pending" },
      include: tradeInclude,
    });
    await tx.listing.update({
      where: { id: data.listingId },
      data: { status: "in_trade" },
    });
    return trade;
  });
}

/**
 * Chốt trade (confirmed hoặc self_reported): cập nhật trạng thái,
 * tạo price_record đúng 1 lần, đóng listing — tất cả trong 1 transaction.
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
    await tx.listing.update({
      where: { id: trade.listingId },
      data: { status: "closed" },
    });
    return trade;
  });
}

/** Hủy trade pending + mở lại listing. */
export function cancelTradeWithListingUnlock(tradeId: string, listingId: string) {
  return prisma.$transaction(async (tx) => {
    const trade = await tx.trade.update({
      where: { id: tradeId },
      data: { status: "cancelled" },
      include: tradeInclude,
    });
    await tx.listing.update({
      where: { id: listingId },
      data: { status: "active" },
    });
    return trade;
  });
}

export function listExpiredPendingTrades(now: Date) {
  return prisma.trade.findMany({
    where: { status: "pending", autoCloseAt: { lte: now } },
    include: tradeInclude,
  });
}

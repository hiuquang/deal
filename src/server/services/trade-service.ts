import { Prisma } from "@prisma/client";
import { ApiError } from "@/server/errors";
import * as tradesRepo from "@/server/repositories/trades";
import { getMembership } from "@/server/services/chat-service";
import { computeFlagForTrade } from "@/server/services/outlier";
import { toTradeDto } from "@/server/serializers";
import type { TradeDto } from "@/lib/types";
import type { TradeWithRelations } from "@/server/repositories/trades";

const AUTO_CLOSE_DAYS = 7;

function assertParticipant(trade: TradeWithRelations, userId: string) {
  if (trade.buyerId !== userId && trade.sellerId !== userId) {
    throw new ApiError(403, "FORBIDDEN", "この取引に参加していません。");
  }
}

/**
 * Lazy auto-close: mọi trade pending quá autoCloseAt được chốt thành
 * self_reported + sinh price_record. Gọi ở các endpoint đọc trade/price
 * thay cho cron — đủ cho MVP (design.md mục 4).
 */
export async function autoCloseExpired(): Promise<number> {
  const expired = await tradesRepo.listExpiredPendingTrades(new Date());
  for (const trade of expired) {
    const flagged = await computeFlagForTrade(
      trade.listing.cardId,
      trade.listing.condition,
      trade.finalPriceJpy
    );
    await tradesRepo.closeTrade(trade.id, "self_reported", {
      cardId: trade.listing.cardId,
      condition: trade.listing.condition,
      priceJpy: trade.finalPriceJpy,
      tradedAt: trade.createdAt,
      flagged,
    });
    console.log(`[trade] auto-closed ${trade.id} as self_reported (flagged=${flagged})`);
  }
  return expired.length;
}

export async function create(
  userId: string,
  input: { conversationId: string; finalPriceJpy: number }
): Promise<TradeDto> {
  const conversation = await getMembership(userId, input.conversationId);

  const existing = await tradesRepo.findActiveTradeByListing(conversation.listingId);
  if (existing) {
    throw new ApiError(409, "TRADE_EXISTS", "この出品には既に取引が存在します。");
  }

  // Check-then-insert ở trên có race window: 2 request gần như đồng thời có
  // thể cùng lọt qua check. DB có partial unique index (trades_one_active_per_listing,
  // xem migration add_active_trade_partial_unique_index) chặn ở tầng thấp nhất —
  // bắt vi phạm đó ở đây và dịch thành cùng lỗi nghiệp vụ TRADE_EXISTS.
  let trade;
  try {
    trade = await tradesRepo.createTradeWithListingLock({
      listingId: conversation.listingId,
      conversationId: conversation.id,
      sellerId: conversation.listing.sellerId,
      buyerId: conversation.buyerId,
      initiatorId: userId,
      finalPriceJpy: input.finalPriceJpy,
      autoCloseAt: new Date(Date.now() + AUTO_CLOSE_DAYS * 24 * 60 * 60 * 1000),
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ApiError(409, "TRADE_EXISTS", "この出品には既に取引が存在します。");
    }
    throw e;
  }
  console.log(
    `[trade] created ${trade.id} on listing ${conversation.listingId} by ${userId} (${input.finalPriceJpy} JPY)`
  );
  return toTradeDto(trade, userId);
}

export async function listMine(userId: string): Promise<TradeDto[]> {
  await autoCloseExpired();
  const trades = await tradesRepo.listTradesForUser(userId);
  return trades.map((trade) => toTradeDto(trade, userId));
}

export async function getById(userId: string, id: string): Promise<TradeDto> {
  await autoCloseExpired();
  const trade = await tradesRepo.findTradeById(id);
  if (!trade) {
    throw new ApiError(404, "NOT_FOUND", "取引が見つかりません。");
  }
  assertParticipant(trade, userId);
  return toTradeDto(trade, userId);
}

/**
 * Xác nhận giao dịch — bước sinh dữ liệu giá.
 * Quy tắc chống khai láo: bên xác nhận sau phải nhập ĐÚNG số tiền bên khởi
 * tạo đã khai; lệch → PRICE_MISMATCH, hai bên tự thống nhất lại trong chat.
 */
export async function confirm(
  userId: string,
  id: string,
  finalPriceJpy: number
): Promise<TradeDto> {
  const trade = await tradesRepo.findTradeById(id);
  if (!trade) {
    throw new ApiError(404, "NOT_FOUND", "取引が見つかりません。");
  }
  assertParticipant(trade, userId);
  if (trade.status !== "pending") {
    throw new ApiError(409, "ALREADY_CONFIRMED", "この取引は既に確定済みです。");
  }
  if (trade.initiatorId === userId) {
    throw new ApiError(
      409,
      "WAITING_COUNTERPART",
      "あなたは既に確認済みです。相手の確認を待っています。"
    );
  }
  if (trade.finalPriceJpy !== finalPriceJpy) {
    throw new ApiError(
      409,
      "PRICE_MISMATCH",
      "相手が入力した金額と一致しません。チャットで金額を確認してください。",
      { expectedHint: "金額が一致するまで取引は確定されません。" }
    );
  }
  const flagged = await computeFlagForTrade(
    trade.listing.cardId,
    trade.listing.condition,
    trade.finalPriceJpy
  );
  const closed = await tradesRepo.closeTrade(id, "confirmed", {
    cardId: trade.listing.cardId,
    condition: trade.listing.condition,
    priceJpy: trade.finalPriceJpy,
    tradedAt: new Date(),
    flagged,
  });
  console.log(
    `[trade] confirmed ${id} by ${userId} → price_record created (flagged=${flagged})`
  );
  return toTradeDto(closed, userId);
}

export async function cancel(userId: string, id: string): Promise<TradeDto> {
  const trade = await tradesRepo.findTradeById(id);
  if (!trade) {
    throw new ApiError(404, "NOT_FOUND", "取引が見つかりません。");
  }
  assertParticipant(trade, userId);
  if (trade.status !== "pending") {
    throw new ApiError(409, "INVALID_STATUS", "確定済みの取引はキャンセルできません。");
  }
  const cancelled = await tradesRepo.cancelTradeWithListingUnlock(id, trade.listingId);
  console.log(`[trade] cancelled ${id} by ${userId}`);
  return toTradeDto(cancelled, userId);
}

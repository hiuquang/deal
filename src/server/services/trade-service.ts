import { Prisma } from "@prisma/client";
import { ApiError } from "@/server/errors";
import { assertConditionMatchesCategory } from "@/server/validation";
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
 * Throttle cho lazy auto-close: autoCloseAt có độ phân giải NGÀY nên quét
 * mỗi request là thừa — dưới tải cao (hàng nghìn GET /trades / /prices mỗi
 * phút) sẽ thành hàng nghìn lần quét trùng nhau. Giới hạn mỗi process chỉ
 * quét tối đa 1 lần/phút; các request trong khoảng đó bỏ qua.
 */
const AUTO_CLOSE_CHECK_INTERVAL_MS = 60_000;
let nextAutoCloseCheckAt = 0;

export async function autoCloseExpiredThrottled(): Promise<number> {
  const now = Date.now();
  if (now < nextAutoCloseCheckAt) return 0;
  nextAutoCloseCheckAt = now + AUTO_CLOSE_CHECK_INTERVAL_MS;
  return autoCloseExpired();
}

/** Chỉ dùng trong test: reset trạng thái throttle giữa các test case. */
export function __resetAutoCloseThrottle() {
  nextAutoCloseCheckAt = 0;
}

/**
 * Lazy auto-close: mọi trade pending quá autoCloseAt được chốt thành
 * self_reported + sinh price_record. Gọi ở các endpoint đọc trade/price
 * (qua bản throttled) thay cho cron — đủ cho MVP (design.md mục 4).
 */
export async function autoCloseExpired(): Promise<number> {
  const expired = await tradesRepo.listExpiredPendingTrades(new Date());
  for (const trade of expired) {
    // card/condition denormalize trên trade (P9) — dùng được cho cả trade
    // listing lẫn buy-order; finalPriceJpy là đơn giá nên so outlier đúng.
    const flagged = await computeFlagForTrade(
      trade.cardId,
      trade.condition,
      trade.finalPriceJpy
    );
    await tradesRepo.closeTrade(trade.id, "self_reported", {
      cardId: trade.cardId,
      condition: trade.condition,
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
  input: {
    conversationId: string;
    finalPriceJpy: number;
    condition?: string | null;
    quantity?: number | null;
  }
): Promise<TradeDto> {
  const conversation = await getMembership(userId, input.conversationId);

  // Guard + dữ liệu card/condition/quantity theo nguồn hội thoại. Hai nguồn
  // khác nhau ở chỗ lấy condition: listing đã khai sẵn; tin gom thì bên khởi
  // tạo khai lúc báo chốt (finalPriceJpy khi đó là ĐƠN GIÁ để so sánh được).
  let source: { listingId?: string; buyOrderId?: string; cardId: string; condition: string; quantity: number };
  if (conversation.buyOrder) {
    if (conversation.buyOrder.status !== "active") {
      throw new ApiError(409, "NOT_ACTIVE", "この募集は既に終了しています。");
    }
    if (!input.condition || !input.quantity) {
      throw new ApiError(400, "VALIDATION", "状態と数量を入力してください。");
    }
    assertConditionMatchesCategory(conversation.buyOrder.card.category, input.condition);
    source = {
      buyOrderId: conversation.buyOrder.id,
      cardId: conversation.buyOrder.cardId,
      condition: input.condition,
      quantity: input.quantity,
    };
  } else if (conversation.listing) {
    // Check sớm cho UX (1 listing 1 trade — kể cả từ hội thoại khác);
    // race window được chặn tiếp ở index DB bên dưới.
    const existing = await tradesRepo.findActiveTradeByListing(conversation.listing.id);
    if (existing) {
      throw new ApiError(409, "TRADE_EXISTS", "この出品には既に取引が存在します。");
    }
    source = {
      listingId: conversation.listing.id,
      cardId: conversation.listing.cardId,
      condition: conversation.listing.condition,
      quantity: 1,
    };
  } else {
    // Bất biến dữ liệu: hội thoại luôn sinh từ listing hoặc buy-order.
    throw new Error(`conversation ${conversation.id} has neither listing nor buy order`);
  }

  // Race window của check-then-insert được chặn ở DB bằng 2 partial unique
  // index (trades_one_active_per_listing / _per_conversation) — bắt P2002 ở
  // đây và dịch thành lỗi nghiệp vụ TRADE_EXISTS.
  let trade;
  try {
    trade = await tradesRepo.createTrade({
      ...source,
      conversationId: conversation.id,
      sellerId: conversation.sellerId,
      buyerId: conversation.buyerId,
      initiatorId: userId,
      finalPriceJpy: input.finalPriceJpy,
      autoCloseAt: new Date(Date.now() + AUTO_CLOSE_DAYS * 24 * 60 * 60 * 1000),
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ApiError(409, "TRADE_EXISTS", "既に進行中の取引が存在します。");
    }
    throw e;
  }
  console.log(
    `[trade] created ${trade.id} (${source.listingId ? `listing ${source.listingId}` : `buy-order ${source.buyOrderId}`}) by ${userId} (${input.finalPriceJpy} JPY x${source.quantity})`
  );
  return toTradeDto(trade, userId);
}

export async function listMine(userId: string): Promise<TradeDto[]> {
  await autoCloseExpiredThrottled();
  const trades = await tradesRepo.listTradesForUser(userId);
  return trades.map((trade) => toTradeDto(trade, userId));
}

export async function getById(userId: string, id: string): Promise<TradeDto> {
  await autoCloseExpiredThrottled();
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
  finalPriceJpy: number,
  quantity?: number | null
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
  // Bên xác nhận cũng phải nhập đúng SỐ LƯỢNG — cùng cơ chế chống khai láo
  // như giá. Trade listing luôn quantity=1 và client không gửi → ?? 1 khớp.
  if (trade.quantity !== (quantity ?? 1)) {
    throw new ApiError(
      409,
      "QUANTITY_MISMATCH",
      "相手が入力した数量と一致しません。チャットで数量を確認してください。"
    );
  }
  // card/condition denormalize trên trade — với trade listing giá trị y hệt
  // listing (backfill + copy lúc tạo); với buy-order do bên khởi tạo khai.
  const flagged = await computeFlagForTrade(
    trade.cardId,
    trade.condition,
    trade.finalPriceJpy
  );
  const closed = await tradesRepo.closeTrade(id, "confirmed", {
    cardId: trade.cardId,
    condition: trade.condition,
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
  const cancelled = await tradesRepo.cancelTrade(id, trade.listingId);
  console.log(`[trade] cancelled ${id} by ${userId}`);
  return toTradeDto(cancelled, userId);
}

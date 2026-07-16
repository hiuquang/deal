import { Prisma } from "@prisma/client";
import { ApiError } from "@/server/errors";
import { BOX_CONDITIONS } from "@/server/validation";
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
  const autoCloseAt = new Date(Date.now() + AUTO_CLOSE_DAYS * 24 * 60 * 60 * 1000);

  // ---- Nhánh trade từ tin gom (buy-order, P9) ----
  // Tin gom không khai condition → bên khởi tạo khai condition + số lượng khi
  // báo chốt; finalPriceJpy là ĐƠN GIÁ (giá/1 bản) để price_record so sánh được.
  if (conversation.buyOrderId && conversation.buyOrder) {
    if (conversation.buyOrder.status !== "active") {
      throw new ApiError(409, "NOT_ACTIVE", "この募集は既に終了しています。");
    }
    if (!input.condition || !input.quantity) {
      throw new ApiError(400, "VALIDATION", "状態と数量を入力してください。");
    }
    // Condition phải khớp loại sản phẩm (như khi đăng listing) — dữ liệu giá
    // sẽ noisy nếu box dùng condition thẻ lẻ và ngược lại.
    const isBoxCondition = (BOX_CONDITIONS as readonly string[]).includes(input.condition);
    if ((conversation.buyOrder.card.category === "box") !== isBoxCondition) {
      throw new ApiError(400, "CONDITION_MISMATCH", "状態が商品種別と一致しません。");
    }
    const existing = await tradesRepo.findActiveTradeByConversation(conversation.id);
    if (existing) {
      throw new ApiError(409, "TRADE_EXISTS", "このチャットには既に取引が存在します。");
    }
    // Race window của check-then-insert được chặn ở DB bằng partial unique
    // index trades_one_active_per_conversation — bắt P2002 và dịch lỗi.
    let trade;
    try {
      trade = await tradesRepo.createBuyOrderTrade({
        buyOrderId: conversation.buyOrderId,
        conversationId: conversation.id,
        sellerId: conversation.sellerId!,
        buyerId: conversation.buyerId,
        initiatorId: userId,
        cardId: conversation.buyOrder.cardId,
        condition: input.condition,
        quantity: input.quantity,
        finalPriceJpy: input.finalPriceJpy,
        autoCloseAt,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ApiError(409, "TRADE_EXISTS", "このチャットには既に取引が存在します。");
      }
      throw e;
    }
    console.log(
      `[trade] created ${trade.id} on buy-order ${conversation.buyOrderId} by ${userId} (${input.finalPriceJpy} JPY x${input.quantity})`
    );
    return toTradeDto(trade, userId);
  }

  // ---- Nhánh trade từ listing (như cũ) ----
  if (!conversation.listingId || !conversation.listing) {
    throw new ApiError(409, "TRADE_NOT_SUPPORTED", "この取引タイプはまだ対応していません。");
  }

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
      cardId: conversation.listing.cardId,
      condition: conversation.listing.condition,
      quantity: 1,
      finalPriceJpy: input.finalPriceJpy,
      autoCloseAt,
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
  // Trade buy-order (quantity > 1 hoặc từ buyOrder): bên xác nhận cũng phải
  // nhập đúng SỐ LƯỢNG — cùng cơ chế chống khai láo như giá.
  if (trade.buyOrderId && trade.quantity !== (quantity ?? 1)) {
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
  // Trade listing: mở lại listing về active. Trade buy-order: không có listing.
  const cancelled = trade.listingId
    ? await tradesRepo.cancelTradeWithListingUnlock(id, trade.listingId)
    : await tradesRepo.cancelTrade(id);
  console.log(`[trade] cancelled ${id} by ${userId}`);
  return toTradeDto(cancelled, userId);
}

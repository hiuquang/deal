"use client";

// Panel xác nhận giao dịch trong trang chat — nơi sinh ra dữ liệu giá.
// Hai loại hội thoại:
// - listing: khai 1 giá thẻ (như cũ).
// - buy_order (P9): khai ĐƠN GIÁ + số lượng + condition (tin gom không khai
//   condition); bên xác nhận phải nhập lại đúng đơn giá VÀ số lượng.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api-client";
import type { Condition, ConversationDto, TradeDto, UserProfileDto } from "@/lib/types";
import { BOX_CONDITION_KEYS, SINGLE_CONDITION_KEYS, formatDate, formatJpy } from "@/lib/labels";
import { ErrorBox, SafetyNote, TradeStatusBadge } from "@/components/ui";
import { RatingSection } from "@/components/rating-section";
import { useI18n, type MessageKey } from "@/lib/i18n";

// Nhịp poll trạng thái trade. Thưa hơn poll chat (6s vs 5s) vì trade đổi trạng
// thái hiếm hơn tin nhắn; chỉ chạy khi tab hiển thị + trade chưa chốt.
const TRADE_POLL_MS = 6_000;

interface Props {
  conversation: ConversationDto;
  myUserId: string;
  onTradeChange: () => void;
}

export function TradePanel({ conversation, myUserId, onTradeChange }: Props) {
  const { t } = useI18n();
  const isBuyOrder = conversation.kind === "buy_order";
  const conditionKeys =
    conversation.card.category === "box" ? BOX_CONDITION_KEYS : SINGLE_CONDITION_KEYS;
  const [trade, setTrade] = useState<TradeDto | null>(null);
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [condition, setCondition] = useState<Condition>(
    conversation.card.category === "box" ? "BOX_SHRINK" : "RAW_NM"
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // An toàn đối phương (P10) — cảnh báo TRƯỚC khi chốt nếu 🟡/🔴.
  const [counterpart, setCounterpart] = useState<UserProfileDto | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getUserProfile(conversation.otherPartyId)
      .then(({ profile }) => !cancelled && setCounterpart(profile))
      .catch(() => {
        // không tải được hồ sơ thì thôi — cảnh báo là lớp phụ, không chặn trade
      });
    return () => {
      cancelled = true;
    };
  }, [conversation.otherPartyId]);

  // Trạng thái trade lấy THEO conversation (không dựa conversation.activeTradeId
  // — chat page không reload conversation khi trade đổi, nên bên đối phương sẽ
  // không biết trade vừa được tạo/xác nhận/hủy). tradeRef để vòng poll biết có
  // cần theo dõi tiếp không mà không phải dựng lại timer mỗi lần state đổi.
  const tradeRef = useRef<TradeDto | null>(null);
  const load = useCallback(async () => {
    try {
      const { trade } = await api.getActiveTrade(conversation.id);
      tradeRef.current = trade;
      setTrade(trade);
    } catch {
      // lỗi tạm thời → giữ nguyên trạng thái hiện tại, thử lại ở tick sau
    }
  }, [conversation.id]);

  useEffect(() => {
    setError(null);
    setPrice("");
    setQty("");
    tradeRef.current = null;
    setTrade(null);
    void load();
  }, [load]);

  // Poll để 2 bên đồng bộ trạng thái chốt giá gần realtime (chat page không tự
  // reload conversation khi trade đổi). Chỉ poll khi tab hiển thị; chỉ fetch khi
  // CHƯA có trade hoặc trade còn pending (đã chốt = terminal, khỏi hỏi tiếp).
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const needsWatch = () => {
      const cur = tradeRef.current;
      return !cur || cur.status === "pending";
    };
    const tick = () => {
      if (stopped) return;
      timer = setTimeout(async () => {
        if (document.visibilityState === "visible" && needsWatch()) await load();
        tick();
      }, TRADE_POLL_MS);
    };
    tick();
    const onVisibility = () => {
      if (document.visibilityState === "visible" && needsWatch()) void load();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onTradeChange();
      await load();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  const priceInput = (
    <input
      type="number"
      min={1}
      max={10000000}
      value={price}
      onChange={(e) => setPrice(e.target.value)}
      placeholder={isBuyOrder ? t("trade.unitPricePlaceholder") : t("trade.pricePlaceholder")}
      aria-label={isBuyOrder ? t("trade.unitPricePlaceholder") : t("trade.pricePlaceholder")}
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
    />
  );

  // Ô số lượng — chỉ dùng cho trade buy-order (khai + xác nhận).
  const qtyInput = (
    <input
      type="number"
      min={1}
      max={999}
      value={qty}
      onChange={(e) => setQty(e.target.value)}
      placeholder={t("trade.qtyPlaceholder")}
      aria-label={t("trade.qtyPlaceholder")}
      className="w-24 shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
    />
  );

  const canSubmit = isBuyOrder ? !!price && !!qty : !!price;

  // Cảnh báo hiện ở mọi giai đoạn trước khi trade chốt (khai + xác nhận) —
  // theo spec Trust & Safety: 🔴 vi phạm đã xác minh, 🟡 đang xem xét.
  const safetyWarning =
    counterpart && (!trade || trade.status === "pending") ? (
      counterpart.safety.level === "red" ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {t("trade.safetyWarnRed", {
            n: counterpart.safety.verifiedCount,
            score: counterpart.trustScore,
          })}
        </p>
      ) : counterpart.safety.level === "yellow" ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
          {t("trade.safetyWarnYellow")}
        </p>
      ) : null
    ) : null;

  return (
    // shrink-0 + max-h: panel trade không bị flex bóp mất nút, quá cao (màn
    // iPhone) thì tự cuộn bên trong thay vì đè lên khung chat.
    <div className="max-h-[50%] shrink-0 space-y-3 overflow-y-auto border-t border-slate-200 bg-slate-50 p-3">
      {error && <ErrorBox message={error} />}
      {safetyWarning}

      {!trade && (
        <div className="space-y-2">
          {/* Nhắc gặp mặt trực tiếp xong mới chốt giá + đánh giá — chặn báo
              hoàn tất khống trước khi hai bên thật sự trao đổi. */}
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs font-medium text-amber-800">
            {t("trade.meetFirst")}
          </p>
          <p className="text-xs text-slate-600">
            {isBuyOrder ? t("trade.boExplain") : t("trade.explain")}
          </p>
          {isBuyOrder && (
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as Condition)}
              aria-label={t("trade.conditionLabel")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {conditionKeys.map((value) => (
                <option key={value} value={value}>
                  {t(`cond.${value}` as MessageKey)}
                </option>
              ))}
            </select>
          )}
          <div className="flex gap-2">
            {priceInput}
            {isBuyOrder && qtyInput}
            <button
              disabled={busy || !canSubmit}
              onClick={() =>
                run(() =>
                  api.createTrade({
                    conversationId: conversation.id,
                    finalPriceJpy: Number(price),
                    ...(isBuyOrder ? { condition, quantity: Number(qty) } : {}),
                  })
                )
              }
              className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {t("trade.report")}
            </button>
          </div>
        </div>
      )}

      {trade && trade.status === "pending" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            {/* Số tiền/số lượng đã khai CHỈ hiện cho bên khởi tạo — bên xác nhận
                phải tự nhập độc lập, nếu không check khớp mất tác dụng. */}
            <span>
              {trade.initiatorId === myUserId ? (
                <strong>
                  {trade.kind === "buy_order"
                    ? t("trade.boReported", {
                        price: formatJpy(trade.finalPriceJpy),
                        n: trade.quantity,
                        cond: t(`cond.${trade.condition}` as MessageKey),
                      })
                    : t("trade.reportedAmount", { price: formatJpy(trade.finalPriceJpy) })}
                </strong>
              ) : (
                t("trade.incomingReport")
              )}
            </span>
            <TradeStatusBadge status={trade.status} />
          </div>
          {trade.initiatorId === myUserId ? (
            <p className="text-xs text-slate-500">
              {t("trade.waiting", { date: formatDate(trade.autoCloseAt) })}
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-600">
                {trade.kind === "buy_order"
                  ? t("trade.boConfirmExplain", {
                      cond: t(`cond.${trade.condition}` as MessageKey),
                    })
                  : t("trade.confirmExplain")}
              </p>
              <SafetyNote messageKey="safety.confirm" />
              <div className="flex gap-2">
                {priceInput}
                {trade.kind === "buy_order" && qtyInput}
                <button
                  disabled={busy || !canSubmit}
                  onClick={() =>
                    run(() =>
                      api.confirmTrade(
                        trade.id,
                        Number(price),
                        trade.kind === "buy_order" ? Number(qty) : null
                      )
                    )
                  }
                  className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {t("trade.confirm")}
                </button>
              </div>
            </div>
          )}
          <button
            disabled={busy}
            onClick={() => run(() => api.cancelTrade(trade.id))}
            className="text-xs text-red-500 hover:underline"
          >
            {t("trade.cancel")}
          </button>
        </div>
      )}

      {trade && (trade.status === "confirmed" || trade.status === "self_reported") && (
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span>
              <strong>
                {trade.kind === "buy_order"
                  ? t("trade.boDone", {
                      price: formatJpy(trade.finalPriceJpy),
                      n: trade.quantity,
                    })
                  : t("trade.done", { price: formatJpy(trade.finalPriceJpy) })}
              </strong>
            </span>
            <TradeStatusBadge status={trade.status} />
          </div>
          <p className="text-xs text-emerald-700">
            {t("trade.thanks")}{" "}
            <Link
              href={`/prices/${conversation.card.id}`}
              className="font-medium underline"
            >
              {t("trade.viewPrices")}
            </Link>
          </p>
          <RatingSection tradeId={trade.id} />
        </div>
      )}
    </div>
  );
}

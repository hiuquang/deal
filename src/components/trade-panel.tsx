"use client";

// Panel xác nhận giao dịch trong trang chat — nơi sinh ra dữ liệu giá.
// Tách hoàn toàn khỏi rating (MVP không có rating) theo design.md mục 2.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api-client";
import type { ConversationDto, TradeDto } from "@/lib/types";
import { formatDate, formatJpy } from "@/lib/labels";
import { ErrorBox, SafetyNote, TradeStatusBadge } from "@/components/ui";
import { RatingSection } from "@/components/rating-section";
import { useI18n } from "@/lib/i18n";

interface Props {
  conversation: ConversationDto;
  myUserId: string;
  onTradeChange: () => void;
}

export function TradePanel({ conversation, myUserId, onTradeChange }: Props) {
  const { t } = useI18n();
  const [trade, setTrade] = useState<TradeDto | null>(null);
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!conversation.activeTradeId) {
      setTrade(null);
      return;
    }
    try {
      const { trade } = await api.getTrade(conversation.activeTradeId);
      setTrade(trade);
    } catch {
      setTrade(null);
    }
  }, [conversation.activeTradeId]);

  useEffect(() => {
    setError(null);
    setPrice("");
    void load();
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
      placeholder={t("trade.pricePlaceholder")}
      aria-label={t("trade.pricePlaceholder")}
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
    />
  );

  return (
    <div className="space-y-3 border-t border-slate-200 bg-slate-50 p-3">
      {error && <ErrorBox message={error} />}

      {!trade && (
        <div className="space-y-2">
          <p className="text-xs text-slate-600">{t("trade.explain")}</p>
          <div className="flex gap-2">
            {priceInput}
            <button
              disabled={busy || !price}
              onClick={() =>
                run(() =>
                  api.createTrade({
                    conversationId: conversation.id,
                    finalPriceJpy: Number(price),
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
            {/* Số tiền đã khai CHỈ hiện cho bên khởi tạo — bên xác nhận phải
                tự nhập độc lập, nếu không check khớp giá mất tác dụng. */}
            <span>
              {trade.initiatorId === myUserId ? (
                <strong>
                  {t("trade.reportedAmount", { price: formatJpy(trade.finalPriceJpy) })}
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
              <p className="text-xs text-slate-600">{t("trade.confirmExplain")}</p>
              <SafetyNote messageKey="safety.confirm" />
              <div className="flex gap-2">
                {priceInput}
                <button
                  disabled={busy || !price}
                  onClick={() => run(() => api.confirmTrade(trade.id, Number(price)))}
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
              <strong>{t("trade.done", { price: formatJpy(trade.finalPriceJpy) })}</strong>
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

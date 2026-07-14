"use client";

// Rating blind-mutual sau khi trade chốt: form 1 lần/bên; rating đối phương
// chỉ hiện khi cả 2 đã rate (chống trả đũa). Không liên quan việc lưu giá.
import { useCallback, useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api-client";
import type { TradeRatingStateDto } from "@/lib/types";
import { ErrorBox } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

function Stars({ score }: { score: number }) {
  return (
    <span className="text-amber-500" aria-label={`★${score}/5`}>
      {"★".repeat(score)}
      <span className="text-slate-300">{"★".repeat(5 - score)}</span>
    </span>
  );
}

export function RatingSection({ tradeId }: { tradeId: string }) {
  const { t } = useI18n();
  const [state, setState] = useState<TradeRatingStateDto | null>(null);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setState(await api.getTradeRating(tradeId));
    } catch {
      // giữ null → không hiển thị gì nếu lỗi tạm thời
    }
  }, [tradeId]);

  useEffect(() => {
    setScore(0);
    setComment("");
    setError(null);
    void load();
  }, [load]);

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      await api.rateTrade(tradeId, { score, comment: comment || null });
      await load();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : t("rate.fail"));
    } finally {
      setBusy(false);
    }
  }

  if (!state) return null;

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold text-slate-600">{t("rate.title")}</p>
      {error && <ErrorBox message={error} />}

      {!state.myRating ? (
        <div className="space-y-2">
          <div className="flex gap-1" role="radiogroup" aria-label={t("rate.aria")}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={score === n}
                onClick={() => setScore(n)}
                className={`text-2xl leading-none ${
                  n <= score ? "text-amber-500" : "text-slate-300"
                } hover:text-amber-400`}
              >
                ★
              </button>
            ))}
          </div>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={300}
            placeholder={t("rate.commentPlaceholder")}
            aria-label={t("rate.commentPlaceholder")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <button
            disabled={busy || score === 0}
            onClick={handleSubmit}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {t("rate.submit")}
          </button>
          <p className="text-[11px] text-slate-400">{t("rate.blindNote")}</p>
        </div>
      ) : !state.revealed ? (
        <p className="text-xs text-slate-500">
          ✓ <Stars score={state.myRating.score} /> — {t("rate.blindNote")}
        </p>
      ) : (
        <div className="space-y-1 text-sm">
          <p>
            {t("rate.mine")} <Stars score={state.myRating.score} />
            {state.myRating.comment && (
              <span className="ml-1 text-xs text-slate-500">「{state.myRating.comment}」</span>
            )}
          </p>
          {state.counterpartRating && (
            <p>
              {t("rate.theirs")} <Stars score={state.counterpartRating.score} />
              {state.counterpartRating.comment && (
                <span className="ml-1 text-xs text-slate-500">
                  「{state.counterpartRating.comment}」
                </span>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

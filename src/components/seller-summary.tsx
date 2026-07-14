"use client";

// Badge uy tín người bán (★ từ rating đã reveal + số giao dịch) + nút 通報.
import { useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api-client";
import type { UserSummaryDto } from "@/lib/types";
import { useAuth } from "@/components/auth-context";
import { ErrorBox } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

interface Props {
  sellerId: string;
  listingId: string;
}

export function SellerSummary({ sellerId, listingId }: Props) {
  const { me } = useAuth();
  const { t } = useI18n();
  const [summary, setSummary] = useState<UserSummaryDto | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api.getUserSummary(sellerId).then(({ user }) => setSummary(user));
  }, [sellerId]);

  async function handleReport() {
    setBusy(true);
    setError(null);
    try {
      await api.reportUser({ reportedUserId: sellerId, listingId, reason });
      setDone(true);
      setShowReport(false);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : t("seller.reportFail"));
    } finally {
      setBusy(false);
    }
  }

  if (!summary) return null;

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{summary.displayName}</p>
          <p className="text-xs text-slate-500">
            {summary.ratingAvg !== null ? (
              <>
                <span className="text-amber-500">★</span> {summary.ratingAvg.toFixed(1)}
                {t("seller.ratingCount", { n: summary.ratingCount })}
              </>
            ) : (
              t("seller.noRating")
            )}
            ・{t("seller.trades", { n: summary.contributionCount })}
          </p>
        </div>
        {me && me.id !== sellerId && !done && (
          <button
            onClick={() => setShowReport((v) => !v)}
            className="text-xs text-slate-400 hover:text-red-500"
          >
            {t("seller.report")}
          </button>
        )}
        {done && <span className="text-xs text-emerald-600">{t("seller.reported")}</span>}
      </div>

      {showReport && (
        <div className="space-y-2 border-t border-slate-100 pt-2">
          {error && <ErrorBox message={error} />}
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder={t("seller.reportPlaceholder")}
            aria-label={t("seller.reportPlaceholder")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
          />
          <button
            disabled={busy || reason.trim().length < 10}
            onClick={handleReport}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {t("seller.reportSend")}
          </button>
        </div>
      )}
    </div>
  );
}

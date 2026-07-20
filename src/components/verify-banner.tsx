"use client";

// Banner nhắc xác nhận email — hiện toàn site khi user chưa verify.
import { useState } from "react";
import { api, ApiClientError } from "@/lib/api-client";
import { useAuth } from "@/components/auth-context";
import { useI18n } from "@/lib/i18n";

export function VerifyBanner() {
  const { me } = useAuth();
  const { t } = useI18n();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!me || me.emailVerified) return null;

  async function handleResend() {
    setBusy(true);
    setError(null);
    try {
      await api.resendVerification();
      setSent(true);
    } catch (e) {
      // fail im lặng (vd. dính rate limit 3 lần/giờ) làm user tưởng đã gửi
      setError(e instanceof ApiClientError ? e.message : t("banner.resendFail"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-2 text-xs text-amber-800">
        <span>
          📧 <strong>{me.email}</strong>
          {t("banner.msg")}
        </span>
        {sent ? (
          <span className="font-medium text-emerald-700">{t("banner.resent")}</span>
        ) : (
          <button
            onClick={handleResend}
            disabled={busy}
            className="font-semibold underline hover:text-amber-900 disabled:opacity-50"
          >
            {t("banner.resend")}
          </button>
        )}
        {error && <span className="font-medium text-red-600">{error}</span>}
      </div>
    </div>
  );
}

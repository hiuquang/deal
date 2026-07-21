"use client";

// Modal chặn toàn màn hình: user đã đăng nhập nhưng chưa đồng ý bản 利用規約
// hiện hành (user cũ, hoặc sau khi điều khoản được cập nhật) → phải đồng ý
// (hoặc đăng xuất) mới dùng tiếp. Server cũng chặn ở requireVerifiedUser.
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/auth-context";
import { useI18n } from "@/lib/i18n";

export function TermsGate() {
  const { me, loading, refresh, logout } = useAuth();
  const { t } = useI18n();
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading || !me || me.termsAccepted) return null;

  async function handleAccept() {
    setBusy(true);
    try {
      await api.acceptTerms();
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("gate.title")}
        className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2 className="text-lg font-bold">{t("gate.title")}</h2>
        <p className="text-sm text-slate-600">{t("gate.desc")}</p>
        <ul className="space-y-1 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <li>{t("gate.point1")}</li>
          <li>{t("gate.point2")}</li>
          <li>{t("gate.point3")}</li>
        </ul>
        <p className="text-sm">
          {t("gate.fulltext")}{" "}
          <Link href="/terms" target="_blank" className="text-indigo-600 underline">
            {t("legal.terms")}
          </Link>
          ·
          <Link href="/privacy" target="_blank" className="text-indigo-600 underline">
            {t("legal.privacy")}
          </Link>
        </p>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-indigo-600"
          />
          <span>{t("gate.agreeLabel")}</span>
        </label>
        <div className="flex gap-2">
          <button
            onClick={handleAccept}
            disabled={!agree || busy}
            className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {t("gate.accept")}
          </button>
          <button
            onClick={() => logout()}
            disabled={busy}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            {t("nav.logout")}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api-client";
import { ErrorBox } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("forgot.fail"));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-sm space-y-4 py-8 text-center">
        <div className="text-4xl">📧</div>
        <h1 className="text-lg font-bold">{t("forgot.sentTitle")}</h1>
        <p className="text-sm text-slate-600">
          <strong>{email}</strong>
          {t("forgot.sentDesc")}
        </p>
        <Link href="/login" className="text-sm text-indigo-600 hover:underline">
          {t("forgot.back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm space-y-4 py-8">
      <h1 className="text-xl font-bold">{t("forgot.title")}</h1>
      <p className="text-sm text-slate-600">{t("forgot.desc")}</p>
      {error && <ErrorBox message={error} />}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            {t("auth.email")}
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? t("auth.sending") : t("forgot.submit")}
        </button>
      </form>
      <p className="text-center text-sm text-slate-500">
        <Link href="/login" className="text-indigo-600 hover:underline">
          {t("forgot.back")}
        </Link>
      </p>
    </div>
  );
}

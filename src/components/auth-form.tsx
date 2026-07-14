"use client";

// Form dùng chung cho login/register — chỉ khác field displayName.
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api-client";
import { useAuth } from "@/components/auth-context";
import { ErrorBox } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { refresh } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "register") {
        await api.register({ email, password, displayName, agreeTerms: agree });
      } else {
        await api.login({ email, password });
      }
      await refresh();
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";

  return (
    <div className="mx-auto max-w-sm space-y-4 py-8">
      <h1 className="text-xl font-bold">
        {mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}
      </h1>
      {error && <ErrorBox message={error} />}
      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "register" && (
          <div>
            <label htmlFor="displayName" className="mb-1 block text-sm font-medium">
              {t("auth.displayName")}
            </label>
            <input
              id="displayName"
              type="text"
              required
              maxLength={30}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={input}
            />
          </div>
        )}
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
            className={input}
          />
        </div>
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <label htmlFor="password" className="block text-sm font-medium">
              {mode === "register" ? t("auth.passwordHint") : t("auth.password")}
            </label>
            {mode === "login" && (
              <Link
                href="/forgot-password"
                className="text-xs text-indigo-600 hover:underline"
              >
                {t("auth.forgot")}
              </Link>
            )}
          </div>
          <input
            id="password"
            type="password"
            required
            minLength={mode === "register" ? 8 : 1}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
        </div>
        {mode === "register" && (
          <label className="flex items-start gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-indigo-600"
            />
            <span>
              {t("auth.agreePrefix")}
              <Link href="/terms" target="_blank" className="text-indigo-600 hover:underline">
                {t("legal.terms")}
              </Link>
              {t("auth.agreeMid")}
              <Link href="/privacy" target="_blank" className="text-indigo-600 hover:underline">
                {t("legal.privacy")}
              </Link>
              {t("auth.agreeSuffix")}
            </span>
          </label>
        )}
        <button
          type="submit"
          disabled={busy || (mode === "register" && !agree)}
          className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy
            ? t("auth.sending")
            : mode === "login"
              ? t("auth.submitLogin")
              : t("auth.submitRegister")}
        </button>
      </form>
      <p className="text-center text-sm text-slate-500">
        {mode === "login" ? (
          <>
            {t("auth.noAccount")}{" "}
            <Link href="/register" className="text-indigo-600 hover:underline">
              {t("nav.register")}
            </Link>
          </>
        ) : (
          <>
            {t("auth.haveAccount")}{" "}
            <Link href="/login" className="text-indigo-600 hover:underline">
              {t("nav.login")}
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

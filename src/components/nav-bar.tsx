"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { LOCALE_OPTIONS, useI18n } from "@/lib/i18n";

function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const current = LOCALE_OPTIONS.find((option) => option.value === locale)!;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        aria-label="Language"
        className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100"
      >
        <span>{current.flag}</span>
        <span className="hidden sm:inline">{current.label}</span>
        <span className="text-[10px] text-slate-400">▼</span>
      </button>
      {open && (
        <ul className="absolute right-0 z-30 mt-1 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {LOCALE_OPTIONS.map((option) => (
            <li key={option.value}>
              <button
                onMouseDown={() => {
                  setLocale(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-indigo-50 ${
                  option.value === locale ? "bg-indigo-50 font-semibold text-indigo-700" : ""
                }`}
              >
                <span>{option.flag}</span> {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function NavBar() {
  const { me, loading, logout } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-4">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="DEAL" className="h-12 w-auto" />
          <span className="hidden text-xs text-slate-500 md:inline">{t("nav.tagline")}</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/" className="hidden rounded-md px-3 py-1.5 hover:bg-slate-100 sm:block">
            {t("nav.browse")}
          </Link>
          <Link href="/listings/new" className="rounded-md px-3 py-1.5 hover:bg-slate-100">
            {t("nav.sell")}
          </Link>
          {me && (
            <Link href="/chat" className="rounded-md px-3 py-1.5 hover:bg-slate-100">
              {t("nav.chat")}
            </Link>
          )}
          {loading ? (
            <span className="px-3 text-slate-400">…</span>
          ) : me ? (
            <>
              <Link
                href="/me"
                className="rounded-md px-3 py-1.5 font-medium text-indigo-700 hover:bg-indigo-50"
              >
                {me.displayName}
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-md px-3 py-1.5 text-slate-500 hover:bg-slate-100"
              >
                {t("nav.logout")}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-md px-3 py-1.5 hover:bg-slate-100">
                {t("nav.login")}
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700"
              >
                {t("nav.register")}
              </Link>
            </>
          )}
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="mx-auto max-w-5xl space-y-2 px-4 py-8 text-center text-xs text-slate-400">
      <p className="space-x-3">
        <Link href="/terms" className="hover:text-indigo-600 hover:underline">
          {t("legal.terms")}
        </Link>
        <Link href="/privacy" className="hover:text-indigo-600 hover:underline">
          {t("legal.privacy")}
        </Link>
      </p>
      <p>{t("footer.tagline")}</p>
    </footer>
  );
}

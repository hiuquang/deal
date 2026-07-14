"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api-client";
import { useAuth } from "@/components/auth-context";
import { Loading } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

function VerifyContent() {
  const token = useSearchParams().get("token");
  const { refresh } = useAuth();
  const { t } = useI18n();
  const [state, setState] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage(t("verify.badLink"));
      return;
    }
    api
      .verifyEmail(token)
      .then(async () => {
        await refresh();
        setState("ok");
      })
      .catch((e) => {
        setState("error");
        setMessage(e instanceof ApiClientError ? e.message : t("verify.errTitle"));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, refresh]);

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-8 text-center">
      {state === "working" && <Loading label={t("verify.working")} />}
      {state === "ok" && (
        <>
          <div className="text-4xl">✅</div>
          <h1 className="text-lg font-bold">{t("verify.okTitle")}</h1>
          <p className="text-sm text-slate-600">{t("verify.okDesc")}</p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            {t("verify.okCta")}
          </Link>
        </>
      )}
      {state === "error" && (
        <>
          <div className="text-4xl">⚠️</div>
          <h1 className="text-lg font-bold">{t("verify.errTitle")}</h1>
          <p className="text-sm text-slate-600">{message}</p>
          <Link href="/" className="text-sm text-indigo-600 hover:underline">
            {t("verify.home")}
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<Loading />}>
      <VerifyContent />
    </Suspense>
  );
}

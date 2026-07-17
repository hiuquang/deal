"use client";

// Hồ sơ công khai (P10): trust score + level/XP + badge + thống kê + an toàn
// + review + tin đang bán. Mọi chỉ số derived phía server (profile-service).
import { use, useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api-client";
import type { UserProfileDto } from "@/lib/types";
import { formatDate } from "@/lib/labels";
import { useAuth } from "@/components/auth-context";
import { ListingCard } from "@/components/listing-card";
import { ErrorBox, Loading } from "@/components/ui";
import { useI18n, type MessageKey } from "@/lib/i18n";

/** Màu theo mức uy tín: xanh ≥80, vàng ≥50, đỏ <50 — khớp ngưỡng badge 🛡. */
function trustColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 50) return "text-amber-500";
  return "text-red-500";
}

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { me } = useAuth();
  const { t } = useI18n();
  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reason, setReason] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .getUserProfile(id)
      .then(({ profile }) => setProfile(profile))
      .catch((e) =>
        setError(e instanceof ApiClientError ? e.message : t("profile.notFound"))
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <ErrorBox message={error} />;
  if (!profile) return <Loading />;

  async function handleReport() {
    setBusy(true);
    setReportError(null);
    try {
      await api.reportUser({ reportedUserId: id, reason });
      setReported(true);
      setShowReport(false);
    } catch (e) {
      setReportError(e instanceof ApiClientError ? e.message : t("seller.reportFail"));
    } finally {
      setBusy(false);
    }
  }

  const xpPercent = Math.round((profile.xpIntoLevel / profile.xpPerLevel) * 100);

  return (
    <div className="space-y-6">
      {/* ---- Header: avatar chữ cái + tên + tier + XP + trust score ---- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl font-black text-white"
          >
            {profile.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold">{profile.displayName}</h1>
            <p className="text-sm font-medium text-indigo-700">
              {t(`profile.tier.${profile.tier}` as MessageKey)}{" "}
              {t("profile.level", { n: profile.level })}
            </p>
            <p className="text-xs text-slate-500">
              {profile.ratingAvg !== null && (
                <>
                  <span className="text-amber-500">★</span> {profile.ratingAvg.toFixed(1)}
                  {t("seller.ratingCount", { n: profile.ratingCount })}・
                </>
              )}
              {t("profile.memberSince", { date: formatDate(profile.memberSince) })}
            </p>
            {/* Thanh XP tới level kế */}
            <div className="mt-2 max-w-xs">
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                {t("profile.xpBar", { cur: profile.xpIntoLevel, next: profile.xpPerLevel })}
              </p>
            </div>
          </div>
          <div className="text-center" title={t("profile.trustScoreHint")}>
            <p className={`text-4xl font-black ${trustColor(profile.trustScore)}`}>
              {profile.trustScore}
            </p>
            <p className="text-[11px] text-slate-500">{t("profile.trustScore")}</p>
          </div>
        </div>
      </section>

      {/* ---- Trust & Safety — chỉ nổi bật khi có gì đáng nói ---- */}
      {profile.safety.level === "red" && (
        <section className="space-y-1 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">
            {t("profile.safety.red", { n: profile.safety.verifiedCount })}
          </p>
          {profile.safety.lastVerifiedAt && (
            <p className="text-xs">
              {t("profile.safety.lastViolation", {
                date: formatDate(profile.safety.lastVerifiedAt),
              })}
            </p>
          )}
        </section>
      )}
      {profile.safety.level === "yellow" && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          {t("profile.safety.yellow")}
        </section>
      )}
      {profile.safety.level === "green" && (
        <p className="text-xs text-slate-400">{t("profile.safety.green")}</p>
      )}

      {/* ---- Thống kê ---- */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-600">
          {t("profile.stats.title")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: t("profile.stats.closed"), value: String(profile.stats.closedTrades) },
            { label: t("profile.stats.partners"), value: String(profile.stats.distinctPartners) },
            {
              label: t("profile.stats.completion"),
              value:
                profile.stats.completionRate !== null
                  ? `${Math.round(profile.stats.completionRate * 100)}%`
                  : "—",
            },
            { label: t("profile.stats.cancelled"), value: String(profile.stats.cancelledTrades) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-[11px] text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Badge ---- */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-600">
          {t("profile.badges.title")}
        </h2>
        {profile.badges.length === 0 ? (
          <p className="text-sm text-slate-400">{t("profile.badges.empty")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {profile.badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700"
              >
                {t(`badge.${badge}` as MessageKey)}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ---- Review gần nhất (chỉ rating đã reveal — blind-mutual giữ nguyên) ---- */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-600">
          {t("profile.reviews.title")}
        </h2>
        {profile.recentReviews.length === 0 ? (
          <p className="text-sm text-slate-400">{t("profile.reviews.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {profile.recentReviews.map((review, i) => (
              <li key={i} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-amber-500">
                    {"★".repeat(review.score)}
                    <span className="text-slate-200">{"★".repeat(5 - review.score)}</span>
                  </span>
                  <span className="text-xs text-slate-400">
                    {review.raterDisplayName}・{formatDate(review.createdAt)}
                  </span>
                </div>
                {review.comment && <p className="mt-1 text-slate-600">{review.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- Tin đang bán ---- */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-600">
          {t("profile.listings.title")}
        </h2>
        {profile.activeListings.length === 0 ? (
          <p className="text-sm text-slate-400">{t("profile.listings.empty")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {profile.activeListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>

      {/* ---- Báo cáo (không tự report mình) ---- */}
      {me && me.id !== id && (
        <section className="border-t border-slate-100 pt-3">
          {reported ? (
            <span className="text-xs text-emerald-600">{t("seller.reported")}</span>
          ) : (
            <button
              onClick={() => setShowReport((v) => !v)}
              className="text-xs text-slate-400 hover:text-red-500"
            >
              {t("seller.report")}
            </button>
          )}
          {showReport && (
            <div className="mt-2 max-w-md space-y-2">
              {reportError && <ErrorBox message={reportError} />}
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
        </section>
      )}
    </div>
  );
}

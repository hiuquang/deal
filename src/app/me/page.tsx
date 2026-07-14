"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import type { ListingDto, TradeDto, UserSummaryDto } from "@/lib/types";
import { formatDate, formatJpy } from "@/lib/labels";
import { useAuth } from "@/components/auth-context";
import { Empty, Loading, TradeStatusBadge } from "@/components/ui";
import { useI18n, type MessageKey } from "@/lib/i18n";

export default function MePage() {
  const { me, loading } = useAuth();
  const { t } = useI18n();
  const [trades, setTrades] = useState<TradeDto[] | null>(null);
  const [listings, setListings] = useState<ListingDto[] | null>(null);
  const [summary, setSummary] = useState<UserSummaryDto | null>(null);

  useEffect(() => {
    if (!me) return;
    void api.listTrades().then(({ trades }) => setTrades(trades));
    void api.listListings({ mine: true }).then(({ listings }) => setListings(listings));
    void api.getUserSummary(me.id).then(({ user }) => setSummary(user));
  }, [me]);

  if (loading) return <Loading />;
  if (!me) {
    return (
      <div className="py-12 text-center text-sm text-slate-600">
        {t("me.loginPrompt")}{" "}
        <Link href="/login" className="text-indigo-600 hover:underline">
          {t("nav.login")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-700">
          {me.displayName.charAt(0)}
        </div>
        <div>
          <h1 className="text-lg font-bold">{me.displayName}</h1>
          <p className="text-xs text-slate-500">{me.email}</p>
          {summary && (
            <p className="text-xs text-slate-500">
              {summary.ratingAvg !== null ? (
                <>
                  <span className="text-amber-500">★</span> {summary.ratingAvg.toFixed(1)}
                  {t("seller.ratingCount", { n: summary.ratingCount })}
                </>
              ) : (
                t("me.noRatingYet")
              )}
            </p>
          )}
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-slate-500">{t("me.contribution")}</p>
          <p className="text-2xl font-black text-indigo-700">{me.contributionCount}</p>
          <p className={`text-xs ${me.canViewPrices ? "text-emerald-600" : "text-amber-600"}`}>
            {me.canViewPrices ? t("me.canView") : t("me.locked")}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">{t("me.trades")}</h2>
        {trades === null ? (
          <Loading />
        ) : trades.length === 0 ? (
          <Empty message={t("me.noTrades")} />
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {trades.map((trade) => (
              <li key={trade.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/chat?c=${trade.conversationId}`}
                    className="line-clamp-1 text-sm font-medium hover:text-indigo-600"
                  >
                    {trade.listing.card.nameJa}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {t("me.with", { name: trade.counterpartName })}
                    {formatDate(trade.createdAt)}・{formatJpy(trade.finalPriceJpy)}
                  </p>
                </div>
                <TradeStatusBadge status={trade.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">{t("me.listings")}</h2>
        {listings === null ? (
          <Loading />
        ) : listings.length === 0 ? (
          <Empty message={t("me.noListings")} />
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {listings.map((listing) => (
              <li key={listing.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/listings/${listing.id}`}
                    className="line-clamp-1 text-sm font-medium hover:text-indigo-600"
                  >
                    {listing.card.nameJa}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {t(`cond.${listing.condition}` as MessageKey)}・
                    {formatJpy(listing.askingPriceJpy)}
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  {t(`lstatus.${listing.status}` as MessageKey)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

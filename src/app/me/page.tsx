"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api-client";
import type { ActivityDto, ListingDto, TradeDto, UserSummaryDto } from "@/lib/types";
import { formatDate, formatDateTime, formatJpy } from "@/lib/labels";
import { useAuth } from "@/components/auth-context";
import { Empty, Loading, TradeStatusBadge, VipBadge, VipName } from "@/components/ui";
import { UNREAD_EVENT } from "@/components/nav-bar";
import { useI18n, type MessageKey } from "@/lib/i18n";

export default function MePage() {
  const { me, loading, refresh } = useAuth();
  const { t } = useI18n();
  const [trades, setTrades] = useState<TradeDto[] | null>(null);
  const [listings, setListings] = useState<ListingDto[] | null>(null);
  const [summary, setSummary] = useState<UserSummaryDto | null>(null);
  const [activity, setActivity] = useState<ActivityDto | null>(null);

  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    void (async () => {
      try {
        const [{ trades }, { listings }, { user }, activityData] = await Promise.all([
          api.listTrades(),
          api.listListings({ mine: true }),
          api.getUserSummary(me.id),
          api.getActivity(),
        ]);
        if (cancelled) return;
        setTrades(trades);
        setListings(listings);
        setSummary(user);
        setActivity(activityData);
        // Mở trang = đã xem hoạt động → ghi mốc rồi báo nav tắt badge.
        // (isNew trong danh sách vừa tải giữ nguyên để user còn thấy cái gì mới.)
        void api
          .markActivityRead()
          .then(() => window.dispatchEvent(new Event(UNREAD_EVENT)))
          .catch(() => {});
      } catch (e) {
        // Session bị thu hồi (vd. vừa đổi mật khẩu ở tab khác) → 401.
        // Đồng bộ lại trạng thái đăng nhập thay vì để lỗi làm sập trang.
        if (e instanceof ApiClientError && e.status === 401) {
          void refresh();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me, refresh]);

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
          <h1 className="text-lg font-bold">
            <VipName name={me.displayName} isVip={me.isVip} />
          </h1>
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
          <Link
            href={`/users/${me.id}`}
            className="mt-1 inline-block rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            {t("me.viewPublicProfile")}
          </Link>
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
        <h2 className="font-bold">
          🔔 {t("me.activity")}
          {activity && activity.newCount > 0 && (
            <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
              {activity.newCount}
            </span>
          )}
        </h2>
        {activity === null ? (
          <Loading />
        ) : activity.items.length === 0 ? (
          <Empty message={t("me.activityEmpty")} />
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {activity.items.map((item, i) => (
              <li key={`${item.kind}-${item.targetId}-${i}`}>
                <Link
                  href={
                    item.kind === "offer"
                      ? `/buy-orders/${item.targetId}`
                      : `/listings/${item.targetId}`
                  }
                  className={`flex items-start gap-2 px-4 py-3 hover:bg-slate-50 ${
                    item.isNew ? "bg-indigo-50/60" : ""
                  }`}
                >
                  <span aria-hidden="true" className="mt-0.5 text-base">
                    {item.kind === "comment" ? "💬" : item.kind === "request" ? "🛒" : "📦"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">
                      <VipName
                        name={item.actorName}
                        isVip={item.actorIsVip}
                        className="font-medium"
                      />{" "}
                      {item.kind === "comment"
                        ? t("me.actComment", { card: item.cardNameJa })
                        : item.kind === "request"
                          ? t("me.actRequest", { card: item.cardNameJa })
                          : t("me.actOffer", { card: item.cardNameJa, n: item.quantity ?? 0 })}
                    </span>
                    {item.body && (
                      <span className="line-clamp-1 block text-xs text-slate-500">
                        「{item.body}」
                      </span>
                    )}
                    <span className="block text-[11px] text-slate-400">
                      {formatDateTime(item.createdAt)}
                    </span>
                  </span>
                  {item.isNew && (
                    <span
                      aria-label={t("me.actNew")}
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500"
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
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
                    {trade.card.nameJa}
                    {trade.quantity > 1 && (
                      <span className="ml-1 text-xs text-slate-500">×{trade.quantity}</span>
                    )}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {t("me.with", { name: trade.counterpartName })}
                    {trade.counterpartIsVip && <VipBadge />}{" "}
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

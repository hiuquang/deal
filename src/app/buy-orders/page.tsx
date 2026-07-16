"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api-client";
import type { BuyOrderDto } from "@/lib/types";
import { BuyOrderCard } from "@/components/buy-order-card";
import { FilterTabs, useBoardFilters } from "@/components/board-filters";
import { Empty, ErrorBox, Loading } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

export default function BuyOrdersPage() {
  return (
    <Suspense fallback={<Loading />}>
      <BuyOrdersContent />
    </Suspense>
  );
}

function BuyOrdersContent() {
  const { t } = useI18n();
  const { query, setQuery, debouncedQuery, game, setGame, category, setCategory } =
    useBoardFilters("/buy-orders");
  const [orders, setOrders] = useState<BuyOrderDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .listBuyOrders({
        ...(debouncedQuery ? { q: debouncedQuery } : {}),
        ...(game ? { game } : {}),
        ...(category ? { category } : {}),
      })
      .then(({ buyOrders, total }) => {
        if (cancelled) return;
        setOrders(buyOrders);
        setTotal(total);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiClientError ? e.message : t("common.loadError"));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, game, category]);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-8 text-white">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">{t("bo.title")}</h1>
          <p className="mt-2 text-sm text-amber-50">{t("bo.desc")}</p>
        </div>
        <Link
          href="/buy-orders/new"
          className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-orange-600 hover:bg-amber-50"
        >
          {t("bo.create")}
        </Link>
      </section>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("bo.searchPlaceholder")}
        aria-label={t("bo.searchPlaceholder")}
        maxLength={100}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
      />

      <FilterTabs
        game={game}
        category={category}
        onGameChange={setGame}
        onCategoryChange={setCategory}
        activeGameClass="bg-amber-600 text-white"
      >
        {t("bo.count", { n: total })}
      </FilterTabs>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} />
      ) : orders.length === 0 ? (
        <Empty
          message={
            debouncedQuery ? t("bo.emptySearch", { q: debouncedQuery }) : t("bo.empty")
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <BuyOrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}

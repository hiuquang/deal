"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api-client";
import type { BuyOrderDto, Category, Game } from "@/lib/types";
import { BuyOrderCard } from "@/components/buy-order-card";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [game, setGame] = useState<Game | "">((searchParams.get("game") as Game) || "");
  const [category, setCategory] = useState<Category | "">(
    (searchParams.get("category") as Category) || ""
  );
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState((searchParams.get("q") || "").trim());
  const [orders, setOrders] = useState<BuyOrderDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  // Đồng bộ bộ lọc lên URL (replace) → back giữ nguyên, link chia sẻ được.
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (game) params.set("game", game);
    if (category) params.set("category", category);
    const qs = params.toString();
    router.replace(qs ? `/buy-orders?${qs}` : "/buy-orders", { scroll: false });
  }, [debouncedQuery, game, category, router]);

  const gameTabs: { value: Game | ""; label: string }[] = [
    { value: "", label: t("home.tabAll") },
    { value: "pokemon", label: t("home.tabPokemon") },
    { value: "onepiece", label: t("home.tabOnepiece") },
  ];
  const categoryTabs: { value: Category | ""; label: string }[] = [
    { value: "", label: t("home.tabAll") },
    { value: "single", label: t("home.tabSingle") },
    { value: "box", label: t("home.tabBox") },
  ];

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

      <div className="flex flex-wrap items-center gap-2">
        {gameTabs.map((tab) => (
          <button
            key={`g-${tab.value}`}
            onClick={() => setGame(tab.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              game === tab.value
                ? "bg-amber-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <span className="mx-1 text-slate-300">|</span>
        {categoryTabs.map((tab) => (
          <button
            key={`c-${tab.value}`}
            onClick={() => setCategory(tab.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              category === tab.value
                ? "bg-violet-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500">{t("bo.count", { n: total })}</span>
      </div>

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

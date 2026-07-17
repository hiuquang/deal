"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { api, ApiClientError } from "@/lib/api-client";
import type { ListingDto } from "@/lib/types";
import { ListingCard } from "@/components/listing-card";
import { FilterTabs, useBoardFilters } from "@/components/board-filters";
import { Empty, ErrorBox, Loading } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

/** Dữ liệu server render sẵn; `key` = "q|game|category" của bộ lọc đã dùng. */
export interface InitialBoard {
  listings: ListingDto[];
  total: number;
  key: string;
}

export function HomeBoard({ initial }: { initial: InitialBoard | null }) {
  // useSearchParams (trong useBoardFilters) cần Suspense boundary trong App Router.
  return (
    <Suspense fallback={<Loading />}>
      <HomeContent initial={initial} />
    </Suspense>
  );
}

function HomeContent({ initial }: { initial: InitialBoard | null }) {
  const { t } = useI18n();
  const { query, setQuery, debouncedQuery, game, setGame, category, setCategory } =
    useBoardFilters("/");
  const [listings, setListings] = useState<ListingDto[]>(initial?.listings ?? []);
  const [total, setTotal] = useState(initial?.total ?? 0);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);
  // Lần effect đầu nếu bộ lọc vẫn khớp dữ liệu SSR thì không refetch.
  const ssrKeyRef = useRef(initial?.key ?? null);

  useEffect(() => {
    if (ssrKeyRef.current === `${debouncedQuery}|${game}|${category}`) return;
    ssrKeyRef.current = null;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .listListings({
        ...(debouncedQuery ? { q: debouncedQuery } : {}),
        ...(game ? { game } : {}),
        ...(category ? { category } : {}),
      })
      .then(({ listings, total }) => {
        if (cancelled) return;
        setListings(listings);
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
      <section className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-8 text-white">
        <h1 className="text-2xl font-black sm:text-3xl">{t("home.heroTitle")}</h1>
        <p className="mt-2 text-sm text-indigo-100">{t("home.heroDesc")}</p>
      </section>

      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("home.searchPlaceholder")}
          aria-label={t("home.searchPlaceholder")}
          maxLength={100}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label={t("home.searchClear")}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      <FilterTabs
        game={game}
        category={category}
        onGameChange={setGame}
        onCategoryChange={setCategory}
      >
        {t("home.count", { n: total })}
      </FilterTabs>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} />
      ) : listings.length === 0 ? (
        <Empty
          message={
            debouncedQuery
              ? t("home.emptySearch", { q: debouncedQuery })
              : t("home.empty")
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}

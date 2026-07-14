"use client";

import { useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api-client";
import type { Category, Game, ListingDto } from "@/lib/types";
import { ListingCard } from "@/components/listing-card";
import { Empty, ErrorBox, Loading } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

export default function HomePage() {
  const { t } = useI18n();
  const [game, setGame] = useState<Game | "">("");
  const [category, setCategory] = useState<Category | "">("");
  const [listings, setListings] = useState<ListingDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      .listListings({
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
  }, [game, category]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-8 text-white">
        <h1 className="text-2xl font-black sm:text-3xl">{t("home.heroTitle")}</h1>
        <p className="mt-2 text-sm text-indigo-100">{t("home.heroDesc")}</p>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        {gameTabs.map((tab) => (
          <button
            key={`g-${tab.value}`}
            onClick={() => setGame(tab.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              game === tab.value
                ? "bg-indigo-600 text-white"
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
        <span className="ml-auto text-xs text-slate-500">{t("home.count", { n: total })}</span>
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} />
      ) : listings.length === 0 ? (
        <Empty message={t("home.empty")} />
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

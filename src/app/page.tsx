"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiClientError } from "@/lib/api-client";
import type { Category, Game, ListingDto } from "@/lib/types";
import { ListingCard } from "@/components/listing-card";
import { Empty, ErrorBox, Loading } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

export default function HomePage() {
  // useSearchParams cần Suspense boundary trong App Router.
  return (
    <Suspense fallback={<Loading />}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  // URL là nguồn chân lý cho tìm kiếm/bộ lọc → back giữ nguyên trạng thái,
  // link đã lọc có thể chia sẻ/bookmark. State khởi tạo từ URL khi mount.
  const [game, setGame] = useState<Game | "">(
    (searchParams.get("game") as Game) || ""
  );
  const [category, setCategory] = useState<Category | "">(
    (searchParams.get("category") as Category) || ""
  );
  // query: gõ tức thì; debouncedQuery: giá trị thật sự gọi API + ghi lên URL
  // (chờ 350ms ngừng gõ) — tránh bắn 1 request / 1 history entry mỗi phím.
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState(
    (searchParams.get("q") || "").trim()
  );
  const [listings, setListings] = useState<ListingDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  // Đồng bộ trạng thái lọc lên URL (replace: không tạo thêm history entry cho
  // mỗi lần gõ/đổi tab). Khi nhấn vào 1 listing rồi Quay lại, browser khôi
  // phục đúng URL này → tìm kiếm/bộ lọc còn nguyên.
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (game) params.set("game", game);
    if (category) params.set("category", category);
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
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

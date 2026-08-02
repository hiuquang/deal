"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiClientError } from "@/lib/api-client";
import type { BuyOrderDto, ListingDto } from "@/lib/types";
import { ListingCard } from "@/components/listing-card";
import { BuyOrderCard } from "@/components/buy-order-card";
import { BoardTypeTabs, FilterTabs, useBoardFilters } from "@/components/board-filters";
import { PriceSearch } from "@/components/price-search";
import { boardKey, type BoardType } from "@/lib/board";
import { Empty, ErrorBox, Loading } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

/** Dữ liệu server render sẵn; `key` = "q|game|category|type" của bộ lọc đã dùng. */
export interface InitialBoard {
  listings: ListingDto[];
  buyOrders: BuyOrderDto[];
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
  const {
    query,
    setQuery,
    debouncedQuery,
    game,
    setGame,
    category,
    setCategory,
    boardType,
    setBoardType,
  } = useBoardFilters("/");
  const [listings, setListings] = useState<ListingDto[]>(initial?.listings ?? []);
  const [buyOrders, setBuyOrders] = useState<BuyOrderDto[]>(initial?.buyOrders ?? []);
  const [total, setTotal] = useState(initial?.total ?? 0);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);
  // Lần effect đầu nếu bộ lọc vẫn khớp dữ liệu SSR thì không refetch.
  const ssrKeyRef = useRef(initial?.key ?? null);

  useEffect(() => {
    if (ssrKeyRef.current === boardKey(debouncedQuery, game, category, boardType)) return;
    ssrKeyRef.current = null;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const filter = {
      ...(debouncedQuery ? { q: debouncedQuery } : {}),
      ...(game ? { game } : {}),
      ...(category ? { category } : {}),
    };
    // Tab "Tất cả" gọi song song 2 endpoint rồi trộn — cố ý KHÔNG gộp thành 1
    // endpoint mới: listing và buy-order là 2 bảng khác nhau, gộp ở tầng SQL sẽ
    // kéo theo phân trang chung phức tạp mà bảng tin hiện chưa hề phân trang.
    Promise.all([
      boardType === "buy"
        ? Promise.resolve({ listings: [] as ListingDto[], total: 0 })
        : api.listListings(filter),
      boardType === "sell"
        ? Promise.resolve({ buyOrders: [] as BuyOrderDto[], total: 0 })
        : api.listBuyOrders(filter),
    ])
      .then(([listingRes, buyOrderRes]) => {
        if (cancelled) return;
        setListings(listingRes.listings);
        setBuyOrders(buyOrderRes.buyOrders);
        setTotal(listingRes.total + buyOrderRes.total);
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
  }, [debouncedQuery, game, category, boardType]);

  // Trộn 2 nguồn thành 1 dòng thời gian, mới nhất trước — nếu xếp hết tin bán
  // rồi mới tới tin mua thì tin đăng mua luôn nằm đáy, coi như vẫn bị giấu,
  // đúng thứ lần gộp này muốn bỏ. createdAt là ISO nên so sánh chuỗi = so thời gian.
  //
  // Ngoại lệ: tin ĐÃ BÁN (chế độ trưng bày) luôn dồn xuống CUỐI — chúng chỉ để
  // trang đỡ trống, không được đẩy hàng còn mua được xuống dưới.
  const items = useMemo(() => {
    const merged = [
      ...listings.map((l) => ({
        kind: "listing" as const,
        at: l.createdAt,
        daBan: l.status === "closed",
        data: l,
      })),
      ...buyOrders.map((b) => ({
        kind: "buy_order" as const,
        at: b.createdAt,
        daBan: false,
        data: b,
      })),
    ];
    return merged.sort(
      (a, b) => Number(a.daBan) - Number(b.daBan) || b.at.localeCompare(a.at)
    );
  }, [listings, buyOrders]);

  return (
    <div className="space-y-6">
      {/* Cửa trước là TRA GIÁ, không phải bảng tin: tra giá dùng được với đúng
          một người, còn chợ cần hai phía. Xem chú thích ở `price-search.tsx`. */}
      <section className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-8 text-white">
        <h1 className="text-2xl font-black sm:text-3xl">{t("home.heroTitle")}</h1>
        <p className="mt-2 text-sm text-indigo-100">{t("home.heroDesc")}</p>
        <div className="mt-5">
          <PriceSearch />
          <p className="mt-2 text-xs text-indigo-200">{t("psearch.hint")}</p>
        </div>
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

      <BoardTypeTabs value={boardType} onChange={setBoardType} />

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
      ) : items.length === 0 ? (
        <Empty message={emptyMessage(t, debouncedQuery, boardType)} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) =>
            item.kind === "listing" ? (
              <ListingCard key={`l-${item.data.id}`} listing={item.data} />
            ) : (
              <BuyOrderCard key={`b-${item.data.id}`} order={item.data} />
            )
          )}
        </div>
      )}
    </div>
  );
}

/** Rỗng vì tìm kiếm, vì lọc riêng tin đăng mua, hay vì chợ chưa có gì — 3 câu khác nhau. */
function emptyMessage(
  t: ReturnType<typeof useI18n>["t"],
  query: string,
  boardType: BoardType
): string {
  if (query) return t("home.emptySearch", { q: query });
  if (boardType === "buy") return t("home.emptyBuy");
  return t("home.empty");
}

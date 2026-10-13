"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiClientError } from "@/lib/api-client";
import type { BuyOrderDto, ListingDto } from "@/lib/types";
import { ListingCard } from "@/components/listing-card";
import { BuyOrderCard } from "@/components/buy-order-card";
import { BoardTypeTabs, FilterTabs, useBoardFilters } from "@/components/board-filters";
import { BoardSearch } from "@/components/board-search";
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
    // space-y-4 (không phải 6): mỗi nấc khoảng cách ở đây đẩy lưới tin xuống
    // thêm ~16px, mà mục tiêu cả đợt này là tin đăng phải nằm trong màn hình
    // đầu tiên trên điện thoại.
    <div className="space-y-4">
      {/* Hero CỐ Ý thấp (~90px trên điện thoại). Bản cũ chiếm 550/812px màn
          hình, cộng ô tìm thứ hai và ba hàng lọc thành hơn 1.100px phải cuộn
          mới thấy tin đầu tiên — người bấm link từ Facebook bỏ đi trước khi
          thấy nội dung. Chợ là nội dung, hero chỉ là tấm biển. */}
      <section className="rounded-2xl bg-brand-600 px-5 py-4 text-white sm:px-6 sm:py-5">
        <h1 className="text-lg font-bold tracking-tight sm:text-xl">{t("home.heroTitle")}</h1>
        <p className="mt-1 text-xs text-brand-100 sm:text-sm">{t("home.heroDesc")}</p>
      </section>

      <BoardSearch value={query} onChange={setQuery} />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <BoardTypeTabs value={boardType} onChange={setBoardType} />
          <span className="shrink-0 text-xs text-slate-500">{t("home.count", { n: total })}</span>
        </div>

        <FilterTabs
          game={game}
          category={category}
          onGameChange={setGame}
          onCategoryChange={setCategory}
        />
      </div>

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

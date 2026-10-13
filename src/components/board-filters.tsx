"use client";

// Bộ lọc của bảng tin tìm kiếm (trang chủ — từ v0.23.0 gộp cả tin bán lẫn
// tin đăng mua; trang /buy-orders riêng đã bỏ, chỉ còn redirect):
// tìm kiếm debounce + lọc game/category, trạng thái đồng bộ lên URL.
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Category, Game } from "@/lib/types";
import { parseBoardType, type BoardType } from "@/lib/board";
import { useI18n } from "@/lib/i18n";

/**
 * State tìm kiếm/lọc khởi tạo từ URL; `debouncedQuery` (chờ 350ms ngừng gõ)
 * là giá trị thật sự để gọi API. Mọi thay đổi đồng bộ lên URL bằng replace
 * (không thêm history entry) → back giữ nguyên kết quả, link chia sẻ được.
 */
export function useBoardFilters(basePath: string) {
  const searchParams = useSearchParams();
  const [game, setGame] = useState<Game | "">((searchParams.get("game") as Game) || "");
  const [boardType, setBoardType] = useState<BoardType>(
    parseBoardType(searchParams.get("type"))
  );
  const [category, setCategory] = useState<Category | "">(
    (searchParams.get("category") as Category) || ""
  );
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState((searchParams.get("q") || "").trim());

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (game) params.set("game", game);
    if (category) params.set("category", category);
    if (boardType) params.set("type", boardType);
    const qs = params.toString();
    // replaceState thay vì router.replace: chỉ cần URL chia sẻ được — router.replace
    // còn kéo theo một vòng RSC (trang chủ giờ dynamic → chạy lại query DB thừa
    // mỗi lần đổi bộ lọc). Next ≥14.1 đồng bộ useSearchParams với History API.
    window.history.replaceState(null, "", qs ? `${basePath}?${qs}` : basePath);
  }, [debouncedQuery, game, category, boardType, basePath]);

  return {
    query,
    setQuery,
    debouncedQuery,
    game,
    setGame,
    category,
    setCategory,
    boardType,
    setBoardType,
  };
}

/**
 * Hàng lọc LOẠI tin (bán / đăng mua) — tách riêng khỏi FilterTabs và đặt phía
 * trên vì đây là trục phân loại chính; nhồi chung sẽ thành 10 nút pill cùng
 * hàng, vỡ layout trên điện thoại.
 */
export function BoardTypeTabs({
  value,
  onChange,
}: {
  value: BoardType;
  onChange: (value: BoardType) => void;
}) {
  const { t } = useI18n();
  // Màu của "Đang bán" / "Đăng mua" khớp màu thẻ tin tương ứng trên lưới
  // (navy / hổ phách) — nút lọc và thẻ nó lọc ra phải cùng một mã màu, nếu
  // không thì màu chỉ là trang trí.
  const tabs: { value: BoardType; label: string; active: string }[] = [
    { value: "", label: t("home.tabAll"), active: "bg-slate-900 text-white" },
    { value: "sell", label: t("home.tabTypeSell"), active: "bg-brand-600 text-white" },
    { value: "buy", label: t("home.tabTypeBuy"), active: "bg-amber-600 text-white" },
  ];
  return (
    <div className="flex items-center gap-1.5" role="tablist">
      {tabs.map((tab) => (
        <button
          key={`t-${tab.value}`}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
            value === tab.value
              ? tab.active
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

interface FilterTabsProps {
  game: Game | "";
  category: Category | "";
  onGameChange: (game: Game | "") => void;
  onCategoryChange: (category: Category | "") => void;
  /** class khi tab game active — mỗi bảng tin 1 màu chủ đạo */
  activeGameClass?: string;
}

export function FilterTabs({
  game,
  category,
  onGameChange,
  onCategoryChange,
  activeGameClass = "bg-brand-600 text-white",
}: FilterTabsProps) {
  const { t } = useI18n();
  const gameTabs: { value: Game | ""; label: string }[] = [
    { value: "", label: t("home.tabAll") },
    { value: "pokemon", label: t("home.tabPokemon") },
    { value: "onepiece", label: t("home.tabOnepiece") },
    { value: "other", label: t("home.tabOther") },
  ];
  const categoryTabs: { value: Category | ""; label: string }[] = [
    { value: "", label: t("home.tabAll") },
    { value: "single", label: t("home.tabSingle") },
    { value: "box", label: t("home.tabBox") },
  ];
  const inactive = "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50";
  const pill = "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition";
  return (
    // CUỘN NGANG thay vì xuống dòng. Bản cũ dùng flex-wrap nên trên màn 375px
    // hàng cuối rơi ra "Khác | Tất cả" — dấu phân cách lạc giữa hàng, trông
    // như lỗi hiển thị. `-mx-4 px-4` cho dải cuộn chạm mép máy (main có px-4).
    <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {gameTabs.map((tab) => (
        <button
          key={`g-${tab.value}`}
          onClick={() => onGameChange(tab.value)}
          className={`${pill} ${game === tab.value ? activeGameClass : inactive}`}
        >
          {tab.label}
        </button>
      ))}
      <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-slate-200" />
      {categoryTabs.map((tab) => (
        <button
          key={`c-${tab.value}`}
          onClick={() => onCategoryChange(tab.value)}
          // Cùng màu active với nhóm game: hai màu khác nhau (tím vs chàm) chỉ
          // làm người ta tưởng hai nhóm khác loại nhau, trong khi cả hai đều
          // là bộ lọc. Phân nhóm bằng vạch ngăn là đủ.
          className={`${pill} ${category === tab.value ? activeGameClass : inactive}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

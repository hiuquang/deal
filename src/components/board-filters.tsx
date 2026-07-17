"use client";

// Bộ lọc dùng chung cho các trang "bảng tin" (trang chủ, まとめ買い):
// tìm kiếm debounce + lọc game/category, trạng thái đồng bộ lên URL.
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Category, Game } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

/**
 * State tìm kiếm/lọc khởi tạo từ URL; `debouncedQuery` (chờ 350ms ngừng gõ)
 * là giá trị thật sự để gọi API. Mọi thay đổi đồng bộ lên URL bằng replace
 * (không thêm history entry) → back giữ nguyên kết quả, link chia sẻ được.
 */
export function useBoardFilters(basePath: string) {
  const searchParams = useSearchParams();
  const [game, setGame] = useState<Game | "">((searchParams.get("game") as Game) || "");
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
    const qs = params.toString();
    // replaceState thay vì router.replace: chỉ cần URL chia sẻ được — router.replace
    // còn kéo theo một vòng RSC (trang chủ giờ dynamic → chạy lại query DB thừa
    // mỗi lần đổi bộ lọc). Next ≥14.1 đồng bộ useSearchParams với History API.
    window.history.replaceState(null, "", qs ? `${basePath}?${qs}` : basePath);
  }, [debouncedQuery, game, category, basePath]);

  return { query, setQuery, debouncedQuery, game, setGame, category, setCategory };
}

interface FilterTabsProps {
  game: Game | "";
  category: Category | "";
  onGameChange: (game: Game | "") => void;
  onCategoryChange: (category: Category | "") => void;
  /** class khi tab game active — mỗi bảng tin 1 màu chủ đạo */
  activeGameClass?: string;
  /** hiển thị bên phải (vd. đếm kết quả) */
  children?: React.ReactNode;
}

export function FilterTabs({
  game,
  category,
  onGameChange,
  onCategoryChange,
  activeGameClass = "bg-indigo-600 text-white",
  children,
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
  const inactive = "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {gameTabs.map((tab) => (
        <button
          key={`g-${tab.value}`}
          onClick={() => onGameChange(tab.value)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            game === tab.value ? activeGameClass : inactive
          }`}
        >
          {tab.label}
        </button>
      ))}
      <span className="mx-1 text-slate-300">|</span>
      {categoryTabs.map((tab) => (
        <button
          key={`c-${tab.value}`}
          onClick={() => onCategoryChange(tab.value)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            category === tab.value ? "bg-violet-600 text-white" : inactive
          }`}
        >
          {tab.label}
        </button>
      ))}
      <span className="ml-auto text-xs text-slate-500">{children}</span>
    </div>
  );
}

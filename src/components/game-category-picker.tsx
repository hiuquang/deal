"use client";

// Cặp picker game + loại sản phẩm dùng chung cho form đăng bán và form
// đăng tin gom (đi cùng CardAutocomplete — đổi lựa chọn là reset thẻ đã chọn,
// phần reset do trang cha lo trong callback).
import type { Category, Game } from "@/lib/types";
import { useI18n, type MessageKey } from "@/lib/i18n";

interface Props {
  game: Game;
  category: Category;
  onGameChange: (game: Game) => void;
  onCategoryChange: (category: Category) => void;
  /** class khi pill game active — theo màu chủ đạo của form */
  activeGameClass?: string;
  gameLabel: string;
  categoryLabel: string;
}

export function GameCategoryPicker({
  game,
  category,
  onGameChange,
  onCategoryChange,
  activeGameClass = "bg-indigo-600 text-white",
  gameLabel,
  categoryLabel,
}: Props) {
  const { t } = useI18n();
  return (
    <>
      <div>
        <span className="mb-1 block text-sm font-medium">{gameLabel}</span>
        <div className="flex gap-2">
          {(["pokemon", "onepiece"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onGameChange(g)}
              className={`rounded-full px-4 py-1.5 text-sm ${
                game === g ? activeGameClass : "bg-slate-100 text-slate-600"
              }`}
            >
              {t(`home.tab${g === "pokemon" ? "Pokemon" : "Onepiece"}` as MessageKey)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium">{categoryLabel}</span>
        <div className="flex gap-2">
          {(["single", "box"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onCategoryChange(c)}
              className={`rounded-full px-4 py-1.5 text-sm ${
                category === c ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {t(`cat.${c}` as MessageKey)}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

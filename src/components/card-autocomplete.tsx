"use client";

// Autocomplete chọn thẻ từ catalog. Từ 0.12.1: MỌI game đều cho đăng ký tên
// mới khi catalog thiếu (find-or-create phía server; entry tự thêm của
// pokemon/onepiece mang setCode CUSTOM — nới business-rules #13 theo quyết
// định chủ web). Nút "thêm mới" CHỈ hiện khi tên gõ vào không khớp chính xác
// thẻ nào — ưu tiên chọn từ catalog để hạn chế noise dữ liệu giá.
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import type { CardDto, Category, Game } from "@/lib/types";
import { cardTitle, cardSpec } from "@/lib/labels";
import { useI18n, type MessageKey } from "@/lib/i18n";

interface Props {
  game?: Game;
  category?: Category;
  onSelect: (card: CardDto | null) => void;
}

export function CardAutocomplete({ game, category, onSelect }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CardDto[]>([]);
  const [selected, setSelected] = useState<CardDto | null>(null);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selected) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { cards } = await api.searchCards(query, game, category);
        setResults(cards);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, game, category, selected]);

  function choose(card: CardDto) {
    setSelected(card);
    setQuery(cardTitle(card));
    setOpen(false);
    onSelect(card);
  }

  function reset(value: string) {
    setSelected(null);
    setQuery(value);
    onSelect(null);
  }

  // Đăng ký query hiện tại thành sản phẩm/thẻ mới rồi chọn luôn (mọi game).
  async function createNew() {
    const name = query.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const { card } = await api.createUserProduct({
        game: game ?? "other",
        name,
        category: category ?? "single",
      });
      choose(card);
    } catch {
      // lỗi (chưa verify email…) → giữ dropdown, user thấy không chọn được
    } finally {
      setCreating(false);
    }
  }

  const isOther = game === "other";
  // Chỉ hiện nút tạo mới khi chưa có sản phẩm trùng tên chính xác — ưu tiên
  // chọn từ catalog, hạn chế entry trùng lặp.
  const canCreate =
    query.trim().length > 0 &&
    !selected &&
    !results.some((c) => c.nameJa === query.trim());

  const placeholder = isOther
    ? t("sell.searchOther")
    : category === "box"
      ? t("sell.searchBox")
      : t("sell.searchCard");

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => reset(e.target.value)}
        onFocus={() => !selected && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
      />
      {open && (results.length > 0 || canCreate) && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.map((card) => (
            <li key={card.id}>
              <button
                type="button"
                onMouseDown={() => choose(card)}
                className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-indigo-50"
              >
                <span className="font-medium">{card.nameJa}</span>
                <span className="text-xs text-slate-500">
                  {t(`game.${card.game}` as MessageKey)}
                  {cardSpec(card) ? `・${cardSpec(card)}` : ""}
                </span>
              </button>
            </li>
          ))}
          {canCreate && (
            <li>
              <button
                type="button"
                onMouseDown={createNew}
                disabled={creating}
                className="flex w-full items-center gap-1 px-3 py-2 text-left text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
              >
                ＋ {t("sell.createOther", { name: query.trim() })}
              </button>
            </li>
          )}
        </ul>
      )}
      {open && query.trim() && results.length === 0 && !selected && !canCreate && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-lg">
          {t("sell.searchEmpty")}
        </div>
      )}
    </div>
  );
}

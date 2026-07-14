"use client";

// Autocomplete chọn thẻ từ catalog chuẩn hóa — user KHÔNG được gõ tên tự do
// (design.md mục 3: chống noise dữ liệu).
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import type { CardDto, Category, Game } from "@/lib/types";
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
    setQuery(`${card.nameJa}（${card.setCode} ${card.cardNumber}）`);
    setOpen(false);
    onSelect(card);
  }

  function reset(value: string) {
    setSelected(null);
    setQuery(value);
    onSelect(null);
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => reset(e.target.value)}
        onFocus={() => !selected && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={category === "box" ? t("sell.searchBox") : t("sell.searchCard")}
        aria-label={category === "box" ? t("sell.searchBox") : t("sell.searchCard")}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
      />
      {open && results.length > 0 && (
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
                  {t(`game.${card.game}` as MessageKey)}・{card.setCode} {card.cardNumber}・
                  {card.rarity}・{card.language}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query.trim() && results.length === 0 && !selected && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-lg">
          {t("sell.searchEmpty")}
        </div>
      )}
    </div>
  );
}

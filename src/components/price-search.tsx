"use client";

// Ô tra giá ở trang chủ. Khác `card-autocomplete` (dùng trong form đăng bán):
// ở đây KHÔNG có nút "thêm sản phẩm mới" — thao tác đó cần đăng nhập + đã
// verify, mà đây là cửa trước cho khách vãng lai từ link group Facebook.
//
// Lý do tồn tại: chợ trade cần hai phía mới dùng được, còn tra giá thì hữu ích
// với đúng MỘT người. Ở giai đoạn gần 0 người dùng, đây mới là thứ đáng đặt
// trên cùng trang chủ — chợ trống đưa lên đầu chỉ làm web trông như đã chết.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import type { CardDto } from "@/lib/types";
import { cardSpec } from "@/lib/labels";
import { useI18n, type MessageKey } from "@/lib/i18n";

export function PriceSearch() {
  const router = useRouter();
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CardDto[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { cards } = await api.searchCards(term);
        setResults(cards);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim() && setOpen(true)}
        // Trễ trước khi đóng: bấm vào kết quả cũng làm input mất focus, đóng
        // ngay thì click không bao giờ tới nơi.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={t("psearch.placeholder")}
        aria-label={t("psearch.placeholder")}
        className="w-full rounded-xl border border-white/40 bg-white px-4 py-3 text-sm text-slate-900 shadow-lg placeholder:text-slate-400 focus:border-white focus:outline-none"
      />
      {open && query.trim() && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-xl">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">{t("psearch.empty")}</p>
          ) : (
            <ul className="max-h-72 overflow-auto">
              {results.map((card) => (
                <li key={card.id}>
                  <button
                    type="button"
                    onMouseDown={() => router.push(`/prices/${card.id}`)}
                    className="flex w-full flex-col px-4 py-2.5 text-left hover:bg-indigo-50"
                  >
                    <span className="text-sm font-medium text-slate-900">{card.nameJa}</span>
                    <span className="text-xs text-slate-500">
                      {t(`game.${card.game}` as MessageKey)}
                      {cardSpec(card) ? `·${cardSpec(card)}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

/**
 * Ô tìm kiếm DUY NHẤT của trang chủ (v0.31.0).
 *
 * Trước đó trang chủ có HAI ô cách nhau 60px làm hai việc khác nhau: ô tra giá
 * trong hero (v0.28.0) và ô lọc bảng tin có sẵn. Người dùng gõ vào ô nào cũng
 * được mà kết quả khác nhau — lỗi do chính đợt v0.28.0 gây ra khi chồng thêm ô
 * mới lên trên ô cũ thay vì gộp.
 *
 * Giờ một ô lo cả hai: gõ xong thì bảng tin bên dưới lọc ngay (như cũ), đồng
 * thời hiện bảng gợi ý "xem giá thẻ" cho các thẻ khớp tên. Tra giá không còn là
 * cửa riêng mà là một lối rẽ ngay trong luồng tìm kiếm.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import type { CardDto } from "@/lib/types";
import { cardSpec } from "@/lib/labels";
import { useI18n, type MessageKey } from "@/lib/i18n";

/** Gợi ý giá tối đa 4 thẻ — nhiều hơn là che mất bảng tin phía dưới. */
const MAX_SUGGESTIONS = 4;

export function BoardSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const [cards, setCards] = useState<CardDto[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const term = value.trim();
    if (!term) {
      setCards([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.searchCards(term);
        setCards(res.cards.slice(0, MAX_SUGGESTIONS));
      } catch {
        // Gợi ý giá hỏng thì im lặng — bảng tin bên dưới vẫn lọc bình thường,
        // không được để lỗi phụ này chắn mất chức năng chính.
        setCards([]);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  const showPanel = open && value.trim().length > 0 && cards.length > 0;

  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m21 21-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"
        />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        // Trễ trước khi đóng: bấm vào gợi ý cũng làm input mất focus, đóng ngay
        // thì cú bấm không bao giờ tới nơi.
        onBlur={() => setTimeout(() => setOpen(false), 160)}
        placeholder={t("home.searchPlaceholder")}
        aria-label={t("home.searchPlaceholder")}
        maxLength={100}
        // Ẩn nút xóa MẶC ĐỊNH của input[type=search] (WebKit/Blink): giữ lại
        // thì cạnh nút ✕ của mình thành HAI nút xóa nằm sát nhau.
        className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-10 text-sm shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={t("home.searchClear")}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          ✕
        </button>
      )}

      {showPanel && (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <p className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">
            {t("bsearch.priceHeading")}
          </p>
          <ul>
            {cards.map((card) => (
              <li key={card.id}>
                <Link
                  href={`/prices/${card.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-brand-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900">
                      {card.nameJa}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {t(`game.${card.game}` as MessageKey)}
                      {cardSpec(card) ? `·${cardSpec(card)}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-brand-600">
                    {t("bsearch.priceCta")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

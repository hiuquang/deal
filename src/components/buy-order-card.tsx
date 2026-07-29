"use client";

import Link from "next/link";
import type { BuyOrderDto } from "@/lib/types";
import { cardSpec, formatJpy } from "@/lib/labels";
import { HeartButton } from "@/components/heart-button";
import { useI18n, type MessageKey } from "@/lib/i18n";

/**
 * Thẻ tin ĐĂNG MUA trên bảng tìm kiếm.
 *
 * Từ v0.23.0 thẻ này nằm CHUNG LƯỚI với ListingCard nên phải cùng khung hình
 * (khối ảnh 3/4 + khối chữ bên dưới) — trước đây nó là thẻ chữ thấp hơn, trộn
 * vào sẽ so le rất xấu. Phân biệt bằng viền hổ phách + nhãn "Đăng mua", không
 * phải bằng kích thước.
 *
 * Ảnh là TÙY CHỌN với tin đăng mua (khác tin bán: bắt buộc) → không có ảnh thì
 * hiện khối giữ chỗ, tuyệt đối không để khung ảnh sập chiều cao.
 */
export function BuyOrderCard({ order }: { order: BuyOrderDto }) {
  const { t } = useI18n();
  return (
    <Link
      href={`/buy-orders/${order.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-amber-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[3/4] bg-amber-50">
        {order.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={order.imageUrl}
            alt={order.card.nameJa}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-amber-400">
            <span className="text-3xl" aria-hidden="true">
              🔎
            </span>
            <span className="px-2 text-center text-xs font-medium">{t("home.badgeBuy")}</span>
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
          {t(`game.${order.card.game}` as MessageKey)}
        </span>
        {order.card.category === "box" && (
          <span className="absolute left-2 top-9 rounded-full bg-violet-600/90 px-2 py-0.5 text-xs font-bold text-white">
            BOX
          </span>
        )}
        <span className="absolute right-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
          {t("home.badgeBuy")}
        </span>
        <span className="absolute bottom-2 left-2 rounded-full bg-amber-600/90 px-2 py-0.5 text-xs font-bold text-white">
          {t("bo.wants", { n: order.quantity })}
        </span>
        <span className="absolute bottom-2 right-2">
          <HeartButton kind="buy_order" id={order.id} />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-1 text-sm font-semibold group-hover:text-amber-700">
          {order.card.nameJa}
        </p>
        {cardSpec(order.card) && (
          <p className="text-xs text-slate-500">{cardSpec(order.card)}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-1 pt-1">
          <span className="text-sm font-bold text-amber-700">
            {order.maxUnitPriceJpy
              ? t("bo.maxUnit", { price: formatJpy(order.maxUnitPriceJpy) })
              : t("bo.noMaxPrice")}
          </span>
          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
            {t("bo.offerCount", { n: order.offerCount })}
          </span>
        </div>
      </div>
    </Link>
  );
}

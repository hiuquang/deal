"use client";

import Link from "next/link";
import type { BuyOrderDto } from "@/lib/types";
import { cardSpec, formatJpy } from "@/lib/labels";
import { HeartButton } from "@/components/heart-button";
import { useI18n, type MessageKey } from "@/lib/i18n";

export function BuyOrderCard({ order }: { order: BuyOrderDto }) {
  const { t } = useI18n();
  return (
    <Link
      href={`/buy-orders/${order.id}`}
      className="group flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
          {t(`game.${order.card.game}` as MessageKey)}
        </span>
        <div className="flex items-center gap-1">
          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
            {t("bo.wants", { n: order.quantity })}
          </span>
          <HeartButton kind="buy_order" id={order.id} />
        </div>
      </div>
      {order.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={order.imageUrl}
          alt={order.card.nameJa}
          className="aspect-[4/3] w-full rounded-lg object-cover"
        />
      )}
      <p className="line-clamp-1 text-sm font-semibold group-hover:text-indigo-600">
        {order.card.nameJa}
      </p>
      {cardSpec(order.card) && (
        <p className="text-xs text-slate-500">{cardSpec(order.card)}</p>
      )}
      <div className="mt-auto flex items-center justify-between pt-1">
        <span className="text-sm font-bold text-indigo-700">
          {order.maxUnitPriceJpy
            ? t("bo.maxUnit", { price: formatJpy(order.maxUnitPriceJpy) })
            : t("bo.noMaxPrice")}
        </span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
          {t("bo.offerCount", { n: order.offerCount })}
        </span>
      </div>
    </Link>
  );
}

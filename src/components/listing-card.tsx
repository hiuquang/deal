"use client";

import Link from "next/link";
import type { ListingDto } from "@/lib/types";
import { cardSpec, formatJpy } from "@/lib/labels";
import { HeartButton } from "@/components/heart-button";
import { useI18n, type MessageKey } from "@/lib/i18n";

export function ListingCard({ listing }: { listing: ListingDto }) {
  const { t } = useI18n();
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[3/4] bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={listing.imageUrl}
          alt={t("detail.photoAlt", { name: listing.card.nameJa })}
          className="h-full w-full object-cover"
        />
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
          {t(`game.${listing.card.game}` as MessageKey)}
        </span>
        {listing.card.category === "box" && (
          <span className="absolute left-2 top-9 rounded-full bg-violet-600/90 px-2 py-0.5 text-xs font-bold text-white">
            BOX
          </span>
        )}
        {listing.status !== "active" && (
          <span className="absolute right-2 top-2 rounded-full bg-slate-800/80 px-2 py-0.5 text-xs text-white">
            {t(`lstatus.${listing.status}` as MessageKey)}
          </span>
        )}
        {listing.quantity > 1 && (
          <span className="absolute bottom-2 left-2 rounded-full bg-indigo-600/90 px-2 py-0.5 text-xs font-bold text-white">
            ×{listing.quantity}
          </span>
        )}
        <span className="absolute bottom-2 right-2">
          <HeartButton kind="listing" id={listing.id} />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-1 text-sm font-semibold group-hover:text-indigo-600">
          {listing.card.nameJa}
        </p>
        {cardSpec(listing.card) && (
          <p className="text-xs text-slate-500">{cardSpec(listing.card)}</p>
        )}
        <p className="text-xs text-slate-500">
          {t(`cond.${listing.condition}` as MessageKey)}
        </p>
        {listing.station && (
          <p className="line-clamp-1 text-xs text-slate-400">📍 {listing.station}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-base font-bold text-indigo-700">
            {listing.askingPriceJpy ? formatJpy(listing.askingPriceJpy) : t("common.negotiable")}
          </span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
            {t(`ttype.${listing.tradeType}` as MessageKey)}
          </span>
        </div>
      </div>
    </Link>
  );
}

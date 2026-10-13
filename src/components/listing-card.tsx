"use client";

import Link from "next/link";
import type { ListingDto } from "@/lib/types";
import { cardSpec, formatJpy } from "@/lib/labels";
import { HeartButton } from "@/components/heart-button";
import { useI18n, type MessageKey } from "@/lib/i18n";

export function ListingCard({ listing }: { listing: ListingDto }) {
  const { t } = useI18n();
  // Tin ĐÃ BÁN vẫn nằm trên bảng tin trong chế độ trưng bày (chợ còn ít tin) —
  // phải nhìn phát biết ngay là không mua được nữa: ảnh xám + băng chéo đỏ.
  const daBan = listing.status === "closed";
  return (
    <Link
      href={`/listings/${listing.id}`}
      className={`group flex flex-col overflow-hidden rounded-xl border bg-white transition hover:-translate-y-0.5 hover:shadow-md ${
        daBan ? "border-slate-300" : "border-slate-200"
      }`}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={listing.imageUrl}
          alt={t("detail.photoAlt", { name: listing.card.nameJa })}
          className={`h-full w-full object-cover ${daBan ? "opacity-50 grayscale" : ""}`}
        />
        {daBan && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 w-[160%] -translate-x-1/2 -translate-y-1/2 -rotate-[20deg] bg-red-600/90 py-1 text-center text-sm font-black tracking-[0.3em] text-white shadow"
          >
            SOLD
          </span>
        )}
        {/* Nhãn game + BOX ĐÃ CHUYỂN xuống khối chữ bên dưới: đè lên ảnh thì
            trên artwork rực rỡ (vd. BOX 30th Celebration) chữ chìm hẳn, không
            đọc được. Trên ảnh chỉ còn thứ phải thấy ngay cả khi lướt nhanh:
            trạng thái, số lượng, nút lưu. */}
        {listing.status !== "active" && (
          <span className="absolute right-2 top-2 rounded-full bg-slate-800/80 px-2 py-0.5 text-xs text-white">
            {t(`lstatus.${listing.status}` as MessageKey)}
          </span>
        )}
        {listing.quantity > 1 && (
          <span className="absolute bottom-2 left-2 rounded-full bg-slate-900/75 px-2 py-0.5 text-xs font-bold text-white">
            ×{listing.quantity}
          </span>
        )}
        <span className="absolute bottom-2 right-2">
          <HeartButton kind="listing" id={listing.id} />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-1 text-sm font-semibold group-hover:text-brand-600">
          {listing.card.nameJa}
        </p>
        {cardSpec(listing.card) && (
          <p className="line-clamp-1 text-xs text-slate-500">{cardSpec(listing.card)}</p>
        )}
        <div className="flex flex-wrap items-center gap-1">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
            {t(`game.${listing.card.game}` as MessageKey)}
          </span>
          {listing.card.category === "box" && (
            <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[11px] font-bold text-brand-700 ring-1 ring-brand-200">
              BOX
            </span>
          )}
          <span className="text-xs text-slate-500">
            {t(`cond.${listing.condition}` as MessageKey)}
          </span>
        </div>
        {listing.station && (
          <p className="line-clamp-1 text-xs text-slate-400">📍 {listing.station}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-1 pt-1">
          <span className="text-base font-bold text-brand-700">
            {listing.askingPriceJpy ? formatJpy(listing.askingPriceJpy) : t("common.negotiable")}
          </span>
          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
            {t(`ttype.${listing.tradeType}` as MessageKey)}
          </span>
        </div>
      </div>
    </Link>
  );
}

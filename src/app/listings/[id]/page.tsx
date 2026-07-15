"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api-client";
import type { ListingDto } from "@/lib/types";
import { formatDate, formatJpy } from "@/lib/labels";
import { useAuth } from "@/components/auth-context";
import { ErrorBox, Loading } from "@/components/ui";
import { SellerSummary } from "@/components/seller-summary";
import { PurchasePanel } from "@/components/purchase-panel";
import { CommentsSection } from "@/components/comments-section";
import { useI18n, type MessageKey } from "@/lib/i18n";

export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { me } = useAuth();
  const { t } = useI18n();
  const [listing, setListing] = useState<ListingDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .getListing(id)
      .then(({ listing }) => setListing(listing))
      .catch((e) =>
        setError(e instanceof ApiClientError ? e.message : t("common.loadError"))
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Nút quay lại nay do BackBar trong layout lo (mọi trang trừ trang chủ).
  if (error) return <ErrorBox message={error} />;
  if (!listing) return <Loading />;

  const isOwner = me?.id === listing.sellerId;

  async function handleCancel() {
    setBusy(true);
    try {
      const { listing: updated } = await api.cancelListing(id);
      setListing(updated);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={listing.imageUrl}
            alt={t("detail.photoAlt", { name: listing.card.nameJa })}
            className="aspect-[3/4] w-full object-cover"
          />
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs text-slate-500">
              {t(`game.${listing.card.game}` as MessageKey)}・
              {t(`cat.${listing.card.category}` as MessageKey)}
            </p>
            <h1 className="text-2xl font-bold">{listing.card.nameJa}</h1>
            <p className="text-sm text-slate-500">
              {listing.card.nameEn}・{listing.card.setCode} {listing.card.cardNumber}・
              {listing.card.rarity}・{listing.card.language}
            </p>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-indigo-700">
              {listing.askingPriceJpy ? formatJpy(listing.askingPriceJpy) : t("common.negotiable")}
            </span>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
              {t(`ttype.${listing.tradeType}` as MessageKey)}
            </span>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
              {t(`lstatus.${listing.status}` as MessageKey)}
            </span>
          </div>

          <dl className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">{t("detail.condition")}</dt>
              <dd className="font-medium">
                {t(`cond.${listing.condition}` as MessageKey)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">{t("detail.quantity")}</dt>
              <dd className="font-medium">
                {t("detail.quantityValue", { n: listing.quantity })}
              </dd>
            </div>
            {listing.station && (
              <div className="flex justify-between">
                <dt className="text-slate-500">📍 {t("detail.station")}</dt>
                <dd className="font-medium">{listing.station}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-500">{t("detail.listedOn")}</dt>
              <dd>{formatDate(listing.createdAt)}</dd>
            </div>
            {listing.note && (
              <div className="border-t border-slate-100 pt-2">
                <dt className="mb-1 text-slate-500">{t("detail.desc")}</dt>
                <dd className="whitespace-pre-wrap">{listing.note}</dd>
              </div>
            )}
          </dl>

          <SellerSummary sellerId={listing.sellerId} listingId={listing.id} />

          <PurchasePanel listing={listing} />

          <div className="space-y-2">
            {isOwner && listing.status === "active" && (
              <button
                onClick={handleCancel}
                disabled={busy}
                className="w-full rounded-lg border border-red-300 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {t("detail.cancel")}
              </button>
            )}
            <Link
              href={`/prices/${listing.card.id}`}
              className="block w-full rounded-lg border border-indigo-200 bg-indigo-50 py-2.5 text-center text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              {t("detail.viewPrices")}
            </Link>
          </div>
        </div>
      </div>

      <CommentsSection listingId={listing.id} />
    </div>
  );
}

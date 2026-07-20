"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api-client";
import type { ListingDto } from "@/lib/types";
import { cardSpec, formatDate, formatJpy } from "@/lib/labels";
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
  // error = lỗi TẢI trang (thay cả trang); actionError = lỗi hành động phụ
  // (hủy tin, sửa giá) hiện inline — không được làm bay nội dung đang xem.
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState("");

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
    setActionError(null);
    try {
      const { listing: updated } = await api.cancelListing(id);
      setListing(updated);
    } catch (e) {
      setActionError(e instanceof ApiClientError ? e.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  function startEditPrice() {
    setPriceInput(listing?.askingPriceJpy ? String(listing.askingPriceJpy) : "");
    setActionError(null);
    setEditingPrice(true);
  }

  async function handleSavePrice() {
    // Ô trống → 要相談 (null); ngược lại gửi số nguyên, server validate 1..上限.
    const trimmed = priceInput.trim();
    const value = trimmed === "" ? null : Number(trimmed);
    setBusy(true);
    setActionError(null);
    try {
      const { listing: updated } = await api.updateListingPrice(id, value);
      setListing(updated);
      setEditingPrice(false);
    } catch (e) {
      setActionError(e instanceof ApiClientError ? e.message : t("common.error"));
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
            {cardSpec(listing.card) && (
              <p className="text-sm text-slate-500">
                {listing.card.nameEn}・{cardSpec(listing.card)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            {actionError && <ErrorBox message={actionError} />}
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-black text-indigo-700">
                {listing.askingPriceJpy ? formatJpy(listing.askingPriceJpy) : t("common.negotiable")}
              </span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                {t(`ttype.${listing.tradeType}` as MessageKey)}
              </span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                {t(`lstatus.${listing.status}` as MessageKey)}
              </span>
              {isOwner && listing.status === "active" && !editingPrice && (
                <button
                  onClick={startEditPrice}
                  className="ml-auto rounded-lg border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                >
                  {t("detail.editPrice")}
                </button>
              )}
            </div>
            {isOwner && editingPrice && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
                <span className="text-sm text-slate-500">¥</span>
                <input
                  type="number"
                  min={1}
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  placeholder={t("detail.pricePlaceholder")}
                  className="w-44 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                />
                <button
                  onClick={handleSavePrice}
                  disabled={busy}
                  className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {t("common.save")}
                </button>
                <button
                  onClick={() => setEditingPrice(false)}
                  disabled={busy}
                  className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                >
                  {t("common.cancel")}
                </button>
              </div>
            )}
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

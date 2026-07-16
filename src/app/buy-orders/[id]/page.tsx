"use client";

import { use, useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api-client";
import type { BuyOrderDto } from "@/lib/types";
import { formatDate, formatJpy } from "@/lib/labels";
import { useAuth } from "@/components/auth-context";
import { ErrorBox, Loading } from "@/components/ui";
import { SellerSummary } from "@/components/seller-summary";
import { OfferPanel } from "@/components/offer-panel";
import { useI18n, type MessageKey } from "@/lib/i18n";

export default function BuyOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { me } = useAuth();
  const { t } = useI18n();
  const [order, setOrder] = useState<BuyOrderDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .getBuyOrder(id)
      .then(({ buyOrder }) => setOrder(buyOrder))
      .catch((e) =>
        setError(e instanceof ApiClientError ? e.message : t("common.loadError"))
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <ErrorBox message={error} />;
  if (!order) return <Loading />;

  const isOwner = me?.id === order.buyerId;

  async function handleCancel() {
    setBusy(true);
    try {
      const { buyOrder } = await api.cancelBuyOrder(id);
      setOrder(buyOrder);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
              {t("bo.wants", { n: order.quantity })}
            </span>
            <p className="text-xs text-slate-500">
              {t(`game.${order.card.game}` as MessageKey)}・
              {t(`cat.${order.card.category}` as MessageKey)}
            </p>
          </div>
          <h1 className="mt-1 text-2xl font-bold">{order.card.nameJa}</h1>
          <p className="text-sm text-slate-500">
            {order.card.nameEn}・{order.card.setCode} {order.card.cardNumber}・
            {order.card.rarity}・{order.card.language}
          </p>
        </div>

        <dl className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">{t("bod.quantity")}</dt>
            <dd className="font-medium">{t("bod.quantityValue", { n: order.quantity })}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">{t("bod.maxPrice")}</dt>
            <dd className="font-medium">
              {order.maxUnitPriceJpy ? formatJpy(order.maxUnitPriceJpy) : t("bo.noMaxPrice")}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">{t("bod.listedOn")}</dt>
            <dd>{formatDate(order.createdAt)}</dd>
          </div>
        </dl>

        <SellerSummary sellerId={order.buyerId} />

        {order.status === "cancelled" && (
          <p className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-600">
            {t("bod.cancelled")}
          </p>
        )}

        {isOwner && order.status === "active" && (
          <button
            onClick={handleCancel}
            disabled={busy}
            className="w-full rounded-lg border border-red-300 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {t("bod.cancel")}
          </button>
        )}
      </div>

      <OfferPanel order={order} />
    </div>
  );
}

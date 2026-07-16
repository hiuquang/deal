"use client";

// Danh sách chào bán công khai + form chào bán (người bán) + nút kết nối (chủ tin).
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api-client";
import type { BuyOrderDto, BuyOrderOfferDto } from "@/lib/types";
import { formatDateTime } from "@/lib/labels";
import { useAuth } from "@/components/auth-context";
import { ErrorBox } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

export function OfferPanel({ order }: { order: BuyOrderDto }) {
  const { me } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [offers, setOffers] = useState<BuyOrderOfferDto[]>([]);
  const [quantity, setQuantity] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isOwner = me?.id === order.buyerId;
  const myOffer = me ? offers.find((o) => o.sellerId === me.id) ?? null : null;
  const canOffer = !!me && !isOwner && order.status === "active" && !myOffer;

  const load = useCallback(async () => {
    try {
      const { offers } = await api.listOffers(order.id);
      setOffers(offers);
    } catch {
      // lỗi tải tạm thời — giữ danh sách cũ
    }
  }, [order.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!quantity) return;
    setBusy(true);
    setError(null);
    try {
      await api.createOffer(order.id, {
        quantity: Number(quantity),
        message: message.trim() || null,
      });
      setQuantity("");
      setMessage("");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function handleConnect(offerId: string) {
    setBusy(true);
    setError(null);
    try {
      const { conversationId } = await api.connectOffer(offerId);
      router.push(`/chat?c=${conversationId}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("common.error"));
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-bold">
        {t("bod.offers")}{" "}
        <span className="font-normal text-slate-400">({offers.length})</span>
      </h2>

      {error && <ErrorBox message={error} />}

      {/* Form chào bán — người bán (không phải chủ tin), tin còn active, chưa chào bán */}
      {canOffer && (
        <form onSubmit={handleOffer} className="space-y-2 rounded-lg bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-800">{t("bod.offerFormTitle")}</p>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={999}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={t("bod.offerQuantity")}
              aria-label={t("bod.offerQuantity")}
              className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
            />
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={300}
              placeholder={t("bod.offerMessagePlaceholder")}
              aria-label={t("bod.offerMessage")}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !quantity}
              className="shrink-0 rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {busy ? t("bod.offerSubmitting") : t("bod.offerSubmit")}
            </button>
          </div>
        </form>
      )}
      {myOffer && <p className="text-xs text-emerald-700">✓ {t("bod.alreadyOffered")}</p>}
      {isOwner && <p className="text-xs text-slate-500">{t("bod.ownOrder")}</p>}
      {!me && <p className="text-xs text-slate-500">{t("bod.loginToOffer")}</p>}

      {offers.length === 0 ? (
        <p className="py-2 text-xs text-slate-400">{t("bod.noOffers")}</p>
      ) : (
        <ul className="space-y-2">
          {offers.map((offer) => (
            <li key={offer.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-indigo-700">
                  {offer.sellerDisplayName}
                  {offer.sellerRatingAvg !== null && (
                    <span className="ml-1 text-amber-500">
                      ★ {offer.sellerRatingAvg.toFixed(1)}
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-slate-400">
                  {formatDateTime(offer.createdAt)}
                </span>
              </div>
              <p className="text-sm font-medium">{t("bod.offerQtyLabel", { n: offer.quantity })}</p>
              {offer.message && (
                <p className="whitespace-pre-wrap break-words text-xs text-slate-600">
                  {offer.message}
                </p>
              )}
              {/* Chủ tin: kết nối / mở chat */}
              {isOwner &&
                (offer.status === "connected" && offer.conversationId ? (
                  <Link
                    href={`/chat?c=${offer.conversationId}`}
                    className="mt-1 inline-block text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    {t("bod.openChat")} →
                  </Link>
                ) : (
                  <button
                    onClick={() => handleConnect(offer.id)}
                    disabled={busy}
                    className="mt-1 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {t("bod.connect")}
                  </button>
                ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

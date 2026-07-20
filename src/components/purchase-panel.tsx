"use client";

// Luồng mua (thay thế chat trực tiếp):
// - Buyer: nút 購入希望を送る → trạng thái chờ seller 連携 → link chat khi đã kết nối.
// - Seller: danh sách người muốn mua (kèm ★ uy tín) + nút 連携する từng người.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiClientError } from "@/lib/api-client";
import type { ListingDto, PurchaseRequestDto } from "@/lib/types";
import { formatDateTime } from "@/lib/labels";
import { useAuth } from "@/components/auth-context";
import { ErrorBox, VipName } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

export function PurchasePanel({ listing }: { listing: ListingDto }) {
  const { me } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const isOwner = me?.id === listing.sellerId;
  const [myRequest, setMyRequest] = useState<PurchaseRequestDto | null>(null);
  const [requests, setRequests] = useState<PurchaseRequestDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!me) return;
    try {
      if (me.id === listing.sellerId) {
        const { requests } = await api.listPurchaseRequests(listing.id);
        setRequests(requests);
      } else {
        const { request } = await api.getMyPurchaseRequest(listing.id);
        setMyRequest(request);
      }
    } catch {
      // lỗi tải tạm thời
    }
  }, [me, listing.id, listing.sellerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  if (!me) {
    return (
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-center text-sm">
        {t("buy.loginPrompt")}{" "}
        <Link href="/login" className="font-semibold text-indigo-700 underline">
          {t("buy.loginLink")}
        </Link>
        {t("buy.loginSuffix")}
      </div>
    );
  }

  // ---- Góc nhìn BUYER ----
  if (!isOwner) {
    if (listing.status !== "active" && !myRequest) return null;
    return (
      <div className="space-y-2">
        {error && <ErrorBox message={error} />}
        {!myRequest ? (
          <button
            onClick={() => run(() => api.sendPurchaseRequest(listing.id))}
            disabled={busy || listing.status !== "active"}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {t("buy.send")}
          </button>
        ) : myRequest.status === "pending" ? (
          // Tin không còn active mà request vẫn pending → nói thẳng là tin đã
          // đóng, đừng để buyer chờ một kết nối không bao giờ tới.
          listing.status !== "active" ? (
            <div className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">
              {t("buy.listingClosed")}
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {t("buy.sent")}
            </div>
          )
        ) : (
          <Link
            href={`/chat?c=${myRequest.conversationId}`}
            className="block w-full rounded-lg bg-emerald-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {t("buy.connectedCta")}
          </Link>
        )}
      </div>
    );
  }

  // ---- Góc nhìn SELLER ----
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-bold">
        {t("buy.listTitle")}{" "}
        <span className="font-normal text-slate-400">
          {t("buy.listCount", { n: requests?.length ?? 0 })}
        </span>
      </h2>
      {error && <ErrorBox message={error} />}
      {/* Tin đã đóng/hủy: vẫn xem danh sách + mở chat đã kết nối, nhưng ẩn nút
          連携 với người mới — kết nối thêm trên tin đã đóng là vô nghĩa. */}
      {listing.status !== "active" && (
        <p className="text-xs text-slate-500">{t("buy.listingClosed")}</p>
      )}
      {!requests || requests.length === 0 ? (
        <p className="text-xs text-slate-400">{t("buy.none")}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {requests.map((request) => (
            <li key={request.id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  <VipName name={request.buyerDisplayName} isVip={request.buyerIsVip} />
                </p>
                <p className="text-xs text-slate-500">
                  {request.buyerRatingAvg !== null ? (
                    <>
                      <span className="text-amber-500">★</span>{" "}
                      {request.buyerRatingAvg.toFixed(1)}
                      {t("seller.ratingCount", { n: request.buyerRatingCount })}
                    </>
                  ) : (
                    t("seller.noRating")
                  )}
                  ・{t("buy.tradesShort", { n: request.buyerContributionCount })}・
                  {formatDateTime(request.createdAt)}
                </p>
              </div>
              {request.status === "connected" ? (
                <Link
                  href={`/chat?c=${request.conversationId}`}
                  className="shrink-0 rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                >
                  {t("buy.toChat")}
                </Link>
              ) : listing.status !== "active" ? null : (
                <button
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const { conversationId } = await api.connectPurchaseRequest(request.id);
                      router.push(`/chat?c=${conversationId}`);
                    })
                  }
                  className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {t("buy.connect")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

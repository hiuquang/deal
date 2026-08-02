"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api-client";
import type {
  CardDto,
  Condition,
  PriceRecordDto,
  PriceStatsDto,
  ReferencePriceDto,
  ReferencePriceStatsDto,
} from "@/lib/types";
import { cardSpec, CONDITION_KEYS, formatDate, formatDateTime, formatJpy } from "@/lib/labels";
import { useAuth } from "@/components/auth-context";
import { PriceChart } from "@/components/price-chart";
import { ReferencePriceChart } from "@/components/reference-price-chart";
import { ErrorBox, Loading, ReliabilityBadge } from "@/components/ui";
import { useI18n, type MessageKey } from "@/lib/i18n";

type Locked = { recordCount: number };

/**
 * Thân trang giá. Vẫn tải phía client vì phần giá giao dịch thật bị gate
 * give-to-get theo người đang đăng nhập — không SSR được, và cũng KHÔNG nên:
 * server-render dữ liệu gate là đem nó dâng cho crawler thứ mà người dùng
 * chưa đóng góp thì không xem được. Server component cha chỉ lo metadata.
 */
export function PricesView({ cardId }: { cardId: string }) {
  const { me, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [condition, setCondition] = useState<Condition | "">("");
  const [card, setCard] = useState<CardDto | null>(null);
  const [records, setRecords] = useState<PriceRecordDto[]>([]);
  const [stats, setStats] = useState<PriceStatsDto | null>(null);
  const [refRecords, setRefRecords] = useState<ReferencePriceDto[]>([]);
  const [refStats, setRefStats] = useState<ReferencePriceStatsDto | null>(null);
  const [locked, setLocked] = useState<Locked | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLocked(null);
    // Giá tham khảo (công khai, không gate) — luôn tải: cho card header + hiển
    // thị mặt bằng giá kể cả khi phần giá-giao-dịch-thật bên dưới bị khóa.
    try {
      const ref = await api.getReferencePrices(cardId);
      setCard(ref.card);
      setRefRecords(ref.records);
      setRefStats(ref.stats);
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 404) {
        setError(e.message);
        setLoading(false);
        return;
      }
      setRefRecords([]);
      setRefStats(null);
    }
    // Giá giao dịch thật — gate give-to-get theo condition.
    try {
      const result = await api.getPrices(cardId, condition || undefined);
      setCard(result.card);
      setRecords(result.records);
      setStats(result.stats);
    } catch (e) {
      if (e instanceof ApiClientError && e.code === "NEED_CONTRIBUTION") {
        setLocked({ recordCount: (e.details as Locked | undefined)?.recordCount ?? 0 });
      } else if (e instanceof ApiClientError && e.status === 401) {
        setLocked({ recordCount: 0 });
      } else if (!(e instanceof ApiClientError && e.status === 404)) {
        // 404 ở đây = thẻ tồn tại (ref đã xác nhận) nhưng lỗi lạ — bỏ qua phần trade.
        setError(e instanceof ApiClientError ? e.message : t("common.loadError"));
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId, condition]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  if (authLoading || loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  return (
    <div className="space-y-5">
      {card && (
        <div>
          <p className="text-xs text-slate-500">{t(`game.${card.game}` as MessageKey)}</p>
          <h1 className="text-xl font-bold">
            {card.nameJa}{" "}
            {cardSpec(card) && (
              <span className="text-sm font-normal text-slate-500">{cardSpec(card)}</span>
            )}
          </h1>
        </div>
      )}

      {/* Giá tham khảo — nguồn ngoài, hiển thị cho mọi người (không gate). */}
      {refRecords.length > 0 && refStats && (
        <section className="space-y-3 rounded-2xl border border-teal-200 bg-teal-50/40 p-4">
          <div>
            <h2 className="text-base font-bold text-teal-800">{t("refprice.title")}</h2>
            <p className="text-xs text-teal-700">
              {t("refprice.source", { source: refRecords[0].source })}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: t("refprice.weightedAvg"), value: formatJpy(refStats.weightedAvg) },
              { label: t("price.min"), value: formatJpy(refStats.min) },
              { label: t("price.max"), value: formatJpy(refStats.max) },
              { label: t("refprice.count"), value: String(refStats.count) },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-teal-200 bg-white p-4">
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className="text-lg font-bold text-teal-700">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-teal-200 bg-white p-4">
            <ReferencePriceChart records={refRecords} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-teal-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-teal-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2">{t("refprice.thDate")}</th>
                  <th className="px-4 py-2">{t("refprice.thQuantity")}</th>
                  <th className="px-4 py-2">{t("refprice.thPrice")}</th>
                </tr>
              </thead>
              <tbody>
                {[...refRecords].reverse().map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-4 py-2">{formatDateTime(r.recordedAt)}</td>
                    <td className="px-4 py-2">{t("refprice.unit", { n: r.quantity })}</td>
                    <td className="px-4 py-2 font-semibold">{formatJpy(r.priceJpy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-500">{t("refprice.disclaimer")}</p>
        </section>
      )}

      {/* Giá giao dịch thật trên DEAL — gate give-to-get. */}
      {locked ? (
        <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <div className="text-4xl">🔒</div>
          <h2 className="text-lg font-bold">{t("lock.title")}</h2>
          <p className="text-sm text-slate-600">{t("lock.desc", { n: locked.recordCount })}</p>
          <p className="text-xs text-slate-400">{t("lock.note")}</p>
          {me ? (
            <Link
              href="/"
              className="inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              {t("lock.ctaBrowse")}
            </Link>
          ) : (
            <Link
              href="/register"
              className="inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              {t("lock.ctaRegister")}
            </Link>
          )}
        </div>
      ) : (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as Condition | "")}
              aria-label={t("price.thCondition")}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">{t("price.allConditions")}</option>
              {CONDITION_KEYS.map((value) => (
                <option key={value} value={value}>
                  {t(`cond.${value}` as MessageKey)}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500">{t("price.note")}</span>
          </div>

          {stats && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: t("price.count"), value: String(stats.count) },
                { label: t("price.median"), value: formatJpy(stats.median) },
                { label: t("price.min"), value: formatJpy(stats.min) },
                { label: t("price.max"), value: formatJpy(stats.max) },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className="text-lg font-bold text-indigo-700">{item.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <PriceChart records={records.filter((r) => !r.flagged)} />
          </div>

          {records.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">{t("price.noData")}</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2">{t("price.thDate")}</th>
                    <th className="px-4 py-2">{t("price.thCondition")}</th>
                    <th className="px-4 py-2">{t("price.thPrice")}</th>
                    <th className="px-4 py-2">{t("price.thReliability")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...records].reverse().map((record, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-4 py-2">{formatDate(record.tradedAt)}</td>
                      <td className="px-4 py-2">
                        {t(`cond.${record.condition}` as MessageKey)}
                      </td>
                      <td className="px-4 py-2 font-semibold">
                        {formatJpy(record.priceJpy)}
                        {record.flagged && (
                          <span
                            className="ml-1 cursor-help text-amber-500"
                            title={t("price.flagTip")}
                          >
                            ⚠
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <ReliabilityBadge reliability={record.reliability} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

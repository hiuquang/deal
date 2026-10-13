"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api-client";
import type {
  CardDto,
  Condition,
  PriceRecordDto,
  PriceStatsDto,
  ReferenceGroupDto,
} from "@/lib/types";
import { cardSpec, CONDITION_KEYS, formatDate, formatDateTime, formatJpy } from "@/lib/labels";
import { useAuth } from "@/components/auth-context";
import { PriceChart } from "@/components/price-chart";
import { ReferencePriceChart } from "@/components/reference-price-chart";
import { ErrorBox, Loading, ReliabilityBadge } from "@/components/ui";
import { useI18n, type MessageKey } from "@/lib/i18n";

/**
 * Quá mốc này thì cảnh báo dữ liệu cũ. Đặt 7 ngày theo bằng chứng thật: giá
 * Round One thu 23–24/7 đã không còn đúng khi chủ web kiểm lại ngày 3/8 —
 * tức 10 ngày là đã sai. Ngưỡng 14 ngày (thử lúc đầu) là quá rộng cho box.
 */
const STALE_AFTER_DAYS = 7;

/**
 * Thân trang giá. Vẫn tải phía client vì danh sách từng giao dịch bị gate
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
  const [refGroups, setRefGroups] = useState<ReferenceGroupDto[]>([]);
  // locked = có dữ liệu nhưng người xem chưa đóng góp (chỉ giấu danh sách chi
  // tiết, số liệu tổng vẫn hiện). recordCount = 0 → thẻ chưa có giao dịch nào,
  // KHÔNG khóa mà nói thẳng là chưa có.
  const [locked, setLocked] = useState(false);
  const [recordCount, setRecordCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLocked(false);
    // Giá tham khảo (công khai, không gate) — luôn tải: cho card header + hiển
    // thị mặt bằng giá kể cả khi phần giá-giao-dịch-thật bên dưới bị khóa.
    try {
      const ref = await api.getReferencePrices(cardId);
      setCard(ref.card);
      setRefGroups(ref.groups);
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 404) {
        setError(e.message);
        setLoading(false);
        return;
      }
      setRefGroups([]);
    }
    // Giá giao dịch thật — endpoint công khai, gate nằm trong response.
    try {
      const result = await api.getPrices(cardId, condition || undefined);
      setCard(result.card);
      setRecords(result.records);
      setStats(result.stats);
      setLocked(result.locked);
      setRecordCount(result.recordCount);
    } catch (e) {
      if (!(e instanceof ApiClientError && e.status === 404)) {
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

  const allRefRecords = refGroups.flatMap((g) => g.records);
  // Tuổi của điểm giá tham khảo MỚI NHẤT (không phải của bản ghi đầu mảng —
  // thứ tự do API quyết, đừng dựa vào nó).
  const newestRefMs = allRefRecords.length
    ? Math.max(...allRefRecords.map((r) => new Date(r.recordedAt).getTime()))
    : null;
  const refAgeDays =
    newestRefMs === null ? null : Math.floor((Date.now() - newestRefMs) / 86_400_000);

  // Khoảng thương lượng: chỉ dựng được khi có CẢ giá shop thu vào lẫn giá rao.
  // Thiếu một đầu thì không có khoảng nào để nói, và bịa ra một con số là
  // đúng kiểu sai mà nhìn vẫn như thật.
  const floorAvg = refGroups.find((g) => g.kind === "kaitori")?.stats.weightedAvg ?? null;
  const askAvg = refGroups.find((g) => g.kind === "rao")?.stats.weightedAvg ?? null;
  const midPrice =
    floorAvg !== null && askAvg !== null && askAvg > floorAvg
      ? Math.round((floorAvg + askAvg) / 2)
      : null;

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

      {/* KHOẢNG THƯƠNG LƯỢNG — lý do tồn tại của cả màn hình này. Shop thu vào
          là mức chắc chắn bán được ngay; giá rao là mức người bán đang hỏi.
          Trade tay đôi phí 0% nên phần chênh đó chia đôi cho hai bên. */}
      {midPrice !== null && (
        <section className="rounded-2xl bg-brand-600 p-4 text-white">
          <h2 className="text-base font-bold">{t("refprice.spreadTitle")}</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-[11px] text-brand-100">{t("refprice.spreadFloor")}</p>
              <p className="text-base font-bold sm:text-lg">{formatJpy(floorAvg)}</p>
            </div>
            <div className="rounded-xl bg-gold-400 p-3 text-brand-900">
              <p className="text-[11px] font-semibold">{t("refprice.spreadMid")}</p>
              <p className="text-base font-black sm:text-lg">{formatJpy(midPrice)}</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-[11px] text-brand-100">{t("refprice.spreadAsk")}</p>
              <p className="text-base font-bold sm:text-lg">{formatJpy(askAvg)}</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-brand-100">
            {t("refprice.spreadNote")}
          </p>
        </section>
      )}

      {/* Giá tham khảo — nguồn ngoài, hiện cho mọi người (không gate). TÁCH
          theo loại: trộn giá shop thu vào với giá rao thành một trung bình là
          con số vô nghĩa mà nhìn vẫn như thật (lỗi tồn tại tới v0.31.0). */}
      {refGroups.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-teal-200 bg-teal-50/40 p-4">
          <div className="space-y-2">
            <h2 className="text-base font-bold text-teal-800">{t("refprice.title")}</h2>
            {/* Giá box biến động theo tuần: trưng số cũ mà không nói gì là nói
                sai về thị trường, và đó đúng là thứ làm mất niềm tin nhanh nhất. */}
            {refAgeDays !== null && refAgeDays > STALE_AFTER_DAYS && (
              <p className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-medium text-amber-900">
                {t("refprice.stale", { n: refAgeDays })}
              </p>
            )}
          </div>

          {refGroups.map((group) => (
            <div key={group.kind} className="space-y-3 rounded-xl border border-teal-200 bg-white p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold text-teal-800">
                  {t(`refkind.${group.kind}` as MessageKey)}
                </h3>
                <p className="text-xs text-teal-700">
                  {t("refprice.source", {
                    source: [...new Set(group.records.map((r) => r.source))].join(" · "),
                  })}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: t("refprice.weightedAvg"), value: formatJpy(group.stats.weightedAvg) },
                  { label: t("price.min"), value: formatJpy(group.stats.min) },
                  { label: t("price.max"), value: formatJpy(group.stats.max) },
                  { label: t("refprice.count"), value: String(group.stats.count) },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-teal-50/60 p-3">
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="text-base font-bold text-teal-700">{item.value}</p>
                  </div>
                ))}
              </div>

              {group.records.length > 1 && <ReferencePriceChart records={group.records} />}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-slate-500">
                    <tr>
                      <th className="py-1 pr-3">{t("refprice.thDate")}</th>
                      <th className="py-1 pr-3">{t("refprice.thQuantity")}</th>
                      <th className="py-1">{t("refprice.thPrice")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...group.records].reverse().map((r, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="py-1.5 pr-3">
                          {/* Link bài gốc để kiểm lại khi con số trông lạ —
                              dữ liệu 買取 do mô hình rút ra nên phải truy được. */}
                          {r.sourceUrl ? (
                            <a
                              href={r.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              className="text-brand-600 underline"
                            >
                              {formatDateTime(r.recordedAt)}
                            </a>
                          ) : (
                            formatDateTime(r.recordedAt)
                          )}
                        </td>
                        <td className="py-1.5 pr-3">{t("refprice.unit", { n: r.quantity })}</td>
                        <td className="py-1.5 font-semibold">{formatJpy(r.priceJpy)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <p className="text-xs text-slate-500">{t("refprice.disclaimer")}</p>
        </section>
      )}

      {/* Giá giao dịch thật trên DEAL. Thẻ chưa có giao dịch nào thì nói thẳng
          là chưa có — KHÔNG dựng ổ khóa lên một cái hộp rỗng. */}
      {recordCount === 0 ? (
        <div className="mx-auto max-w-md space-y-3 rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h2 className="text-lg font-bold">{t("price.noneTitle")}</h2>
          <p className="text-sm text-slate-600">{t("price.noneDesc")}</p>
          {!me && (
            <Link
              href="/register"
              className="inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
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
                  <p className="text-lg font-bold text-brand-700">{item.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Chưa đóng góp: số liệu tổng ở trên vẫn hiện (đủ để tin là dữ liệu
              có thật), chỉ biểu đồ + danh sách từng giao dịch mới phải đổi. */}
          {locked ? (
            <div className="space-y-3 rounded-2xl border border-brand-200 bg-brand-50/50 p-6 text-center">
              <p className="text-sm font-semibold text-brand-900">
                {t("lock.teaser", { n: recordCount })}
              </p>
              <p className="text-xs text-slate-500">{t("lock.note")}</p>
              <Link
                href={me ? "/" : "/register"}
                className="inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                {me ? t("lock.ctaBrowse") : t("lock.ctaRegister")}
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <PriceChart records={records.filter((r) => !r.flagged)} />
            </div>
          )}

          {locked ? null : records.length === 0 ? (
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

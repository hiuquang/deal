"use client";

// Biểu đồ đường SVG tự vẽ (không thêm dependency) cho lịch sử giá đóng.
import type { PriceRecordDto } from "@/lib/types";
import { formatJpy } from "@/lib/labels";
import { useI18n, type MessageKey } from "@/lib/i18n";

const W = 640;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 64 };

export function PriceChart({ records }: { records: PriceRecordDto[] }) {
  const { t } = useI18n();
  if (records.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">{t("price.chartNeed")}</p>
    );
  }

  const xs = records.map((r) => new Date(r.tradedAt).getTime());
  const ys = records.map((r) => r.priceJpy);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const ySpan = yMax - yMin || 1;
  const xSpan = xMax - xMin || 1;

  const px = (t: number) =>
    PAD.left + ((t - xMin) / xSpan) * (W - PAD.left - PAD.right);
  const py = (v: number) =>
    H - PAD.bottom - ((v - yMin) / ySpan) * (H - PAD.top - PAD.bottom);

  const path = records
    .map((r, i) => `${i === 0 ? "M" : "L"}${px(xs[i]).toFixed(1)},${py(r.priceJpy).toFixed(1)}`)
    .join(" ");

  const yTicks = [yMin, yMin + ySpan / 2, yMax];
  const fmtDate = (t: number) => {
    const d = new Date(t);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={t("price.chartAria")}
    >
      {yTicks.map((v, i) => (
        <g key={i}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={py(v)}
            y2={py(v)}
            stroke="#e2e8f0"
            strokeDasharray="4 4"
          />
          <text x={PAD.left - 8} y={py(v) + 4} textAnchor="end" fontSize="11" fill="#64748b">
            {formatJpy(Math.round(v))}
          </text>
        </g>
      ))}
      <text x={PAD.left} y={H - 8} fontSize="11" fill="#64748b">
        {fmtDate(xMin)}
      </text>
      <text x={W - PAD.right} y={H - 8} textAnchor="end" fontSize="11" fill="#64748b">
        {fmtDate(xMax)}
      </text>
      <path d={path} fill="none" stroke="#4f46e5" strokeWidth="2" />
      {records.map((r, i) => (
        <circle
          key={i}
          cx={px(xs[i])}
          cy={py(r.priceJpy)}
          r="3.5"
          fill={r.reliability === "confirmed" ? "#059669" : "#d97706"}
        >
          <title>
            {formatJpy(r.priceJpy)}（{t(`rel.${r.reliability}` as MessageKey)}）
          </title>
        </circle>
      ))}
    </svg>
  );
}

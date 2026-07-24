"use client";

// Biểu đồ đường SVG cho giá tham khảo (nguồn ngoài). Tách khỏi PriceChart vì
// dữ liệu tham khảo không có reliability/flag — dot 1 màu, tooltip kèm số lượng.
import type { ReferencePriceDto } from "@/lib/types";
import { formatJpy } from "@/lib/labels";
import { useI18n } from "@/lib/i18n";

const W = 640;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 64 };

export function ReferencePriceChart({ records }: { records: ReferencePriceDto[] }) {
  const { t } = useI18n();
  if (records.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">{t("price.chartNeed")}</p>
    );
  }

  const xs = records.map((r) => new Date(r.recordedAt).getTime());
  const ys = records.map((r) => r.priceJpy);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const ySpan = yMax - yMin || 1;
  const xSpan = xMax - xMin || 1;

  const px = (v: number) => PAD.left + ((v - xMin) / xSpan) * (W - PAD.left - PAD.right);
  const py = (v: number) =>
    H - PAD.bottom - ((v - yMin) / ySpan) * (H - PAD.top - PAD.bottom);

  const path = records
    .map((r, i) => `${i === 0 ? "M" : "L"}${px(xs[i]).toFixed(1)},${py(r.priceJpy).toFixed(1)}`)
    .join(" ");

  const yTicks = [yMin, yMin + ySpan / 2, yMax];
  const fmtDate = (v: number) => {
    const d = new Date(v);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={t("refprice.chartAria")}
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
      <path d={path} fill="none" stroke="#0d9488" strokeWidth="2" />
      {records.map((r, i) => (
        <circle key={i} cx={px(xs[i])} cy={py(r.priceJpy)} r="3.5" fill="#0d9488">
          <title>
            {formatJpy(r.priceJpy)} ×{r.quantity}
          </title>
        </circle>
      ))}
    </svg>
  );
}

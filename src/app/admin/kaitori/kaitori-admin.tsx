"use client";

/**
 * Bàn duyệt giá 買取 — CHỈ CHỦ WEB.
 *
 * ⚠️ NGOẠI LỆ CÓ CHỦ ĐÍCH với quy tắc i18n của dự án (CLAUDE.md #5: chuỗi UI
 * mới phải vào `messages.ts` đủ vi+en). Trang này không thuộc bề mặt sản phẩm —
 * đúng một người xem, người đó nói tiếng Việt. Dịch sang tiếng Anh ở đây chỉ
 * làm phình từ điển dùng chung mà không ai đọc. Mọi trang người dùng thấy vẫn
 * theo đúng quy tắc.
 *
 * Nguyên tắc không được phá: Grok ĐỀ XUẤT, người DUYỆT. Nút "Lưu" chỉ gửi đi
 * những dòng đã tick VÀ đã được gắn thẻ trong catalog bằng tay.
 */

import { useState } from "react";
import { api, ApiClientError } from "@/lib/api-client";
import type { CardDto, KaitoriCandidateDto } from "@/lib/types";
import { CardAutocomplete } from "@/components/card-autocomplete";
import { ErrorBox } from "@/components/ui";
import { formatJpy } from "@/lib/labels";

interface Row {
  candidate: KaitoriCandidateDto;
  card: CardDto | null;
  priceJpy: number;
  checked: boolean;
}

export function KaitoriAdmin({ defaultHandles }: { defaultHandles: string[] }) {
  const [handles, setHandles] = useState(defaultHandles.join(", "));
  const [days, setDays] = useState(3);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [meta, setMeta] = useState<{ postsFetched: number; fromDate: string; toDate: string } | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<number | null>(null);

  async function handleScan() {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const res = await api.scanKaitori({
        handles: handles
          .split(/[,\s]+/)
          .map((h) => h.trim())
          .filter(Boolean),
        days,
      });
      setMeta({ postsFetched: res.postsFetched, fromDate: res.fromDate, toDate: res.toDate });
      setRows(
        res.items.map((candidate) => ({
          candidate,
          card: null,
          priceJpy: candidate.priceJpy,
          // Mặc định KHÔNG tick: bắt đọc từng dòng. Tick sẵn hết là mời bấm
          // "Lưu" cho nhanh rồi rác chui thẳng vào dataset.
          checked: false,
        }))
      );
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Quét thất bại.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    const ready = (rows ?? []).filter((r) => r.checked && r.card);
    if (ready.length === 0) {
      setError("Chưa có dòng nào vừa được tick vừa đã chọn thẻ.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.importKaitori(
        ready.map((r) => ({
          cardId: r.card!.id,
          priceJpy: r.priceJpy,
          shop: r.candidate.shop,
          postedOn: r.candidate.postedOn,
          sourceUrl: r.candidate.sourceUrl,
        }))
      );
      setSaved(res.saved);
      // Bỏ các dòng đã lưu khỏi bảng để không bấm lưu hai lần nhầm.
      setRows((prev) => (prev ?? []).filter((r) => !(r.checked && r.card)));
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Lưu thất bại.");
    } finally {
      setBusy(false);
    }
  }

  function update(index: number, patch: Partial<Row>) {
    setRows((prev) => (prev ?? []).map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  const readyCount = (rows ?? []).filter((r) => r.checked && r.card).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Thu thập giá 買取 từ X</h1>
        <p className="mt-1 text-sm text-slate-600">
          Grok quét X rồi <strong>đề xuất</strong>. Không dòng nào vào dữ liệu giá cho tới khi bạn
          tick và chọn đúng sản phẩm trong catalog.
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <label className="block text-sm font-medium">
          Tài khoản X của shop (cách nhau bằng dấu phẩy)
          <textarea
            value={handles}
            onChange={(e) => setHandles(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium">
          Quét ngược bao nhiêu ngày
          <input
            type="number"
            min={1}
            max={14}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="mt-1 w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          onClick={handleScan}
          disabled={busy}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {busy ? "Đang quét…" : "Quét giá 買取"}
        </button>
        <p className="text-xs text-slate-500">
          Mỗi lượt quét gọi API xAI và <strong>tốn tiền thật</strong> (~$5 cho mỗi 1.000 bài đọc).
        </p>
      </div>

      {error && <ErrorBox message={error} />}
      {saved !== null && (
        <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
          ✓ Đã lưu {saved} điểm giá vào dữ liệu giá tham khảo.
        </p>
      )}

      {meta && (
        <p className="text-xs text-slate-500">
          Đã đọc {meta.postsFetched} bài, khoảng {meta.fromDate} → {meta.toDate}.
        </p>
      )}

      {rows && rows.length === 0 && (
        <p className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">
          Không tìm thấy bài 買取 nào trong khoảng này.
        </p>
      )}

      {rows && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((row, i) => (
            <div
              key={`${row.candidate.shop}-${i}`}
              className={`space-y-3 rounded-xl border p-3 ${
                row.checked && row.card ? "border-emerald-300 bg-emerald-50/40" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={row.checked}
                  onChange={(e) => update(i, { checked: e.target.checked })}
                  className="mt-1 h-4 w-4 shrink-0"
                  aria-label="Duyệt dòng này"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{row.candidate.productName}</p>
                  <p className="text-xs text-slate-500">
                    @{row.candidate.shop} · {row.candidate.postedOn}
                    {row.candidate.sourceUrl && (
                      <>
                        {" · "}
                        <a
                          href={row.candidate.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="text-brand-600 underline"
                        >
                          bài gốc
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <label className="block text-[11px] text-slate-500">Giá (¥)</label>
                  <input
                    type="number"
                    min={1}
                    value={row.priceJpy}
                    onChange={(e) => update(i, { priceJpy: Number(e.target.value) })}
                    className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-right text-sm"
                  />
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs text-slate-500">
                  {row.card ? (
                    <span className="font-medium text-emerald-700">
                      → {row.card.nameJa} ({formatJpy(row.priceJpy)})
                    </span>
                  ) : (
                    "Chọn sản phẩm trong catalog để lưu được dòng này"
                  )}
                </p>
                <CardAutocomplete onSelect={(card) => update(i, { card })} />
              </div>
            </div>
          ))}

          <div className="sticky bottom-4 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
            <button
              onClick={handleSave}
              disabled={busy || readyCount === 0}
              className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy ? "Đang lưu…" : `Lưu ${readyCount} dòng đã duyệt`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

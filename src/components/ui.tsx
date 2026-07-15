"use client";

// Các mảnh UI nhỏ dùng chung: trạng thái loading / error / empty + badge.
import type { Reliability, TradeStatus } from "@/lib/types";
import { useI18n, type MessageKey } from "@/lib/i18n";

export function Loading({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      {label ?? t("common.loading")}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {message}
    </div>
  );
}

/** Dòng nhắc an toàn màu đỏ (chống lừa đảo). Nhỏ, không chiếm chỗ. */
export function SafetyNote({ messageKey }: { messageKey: MessageKey }) {
  const { t } = useI18n();
  return (
    <p role="note" className="flex items-start gap-1 text-xs text-red-600">
      <span aria-hidden="true">⚠️</span>
      <span>{t(messageKey)}</span>
    </p>
  );
}

export function Empty({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 py-12 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

export function ReliabilityBadge({ reliability }: { reliability: Reliability }) {
  const { t } = useI18n();
  const style =
    reliability === "confirmed"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-amber-100 text-amber-700";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {t(`rel.${reliability}` as MessageKey)}
    </span>
  );
}

export function TradeStatusBadge({ status }: { status: TradeStatus }) {
  const { t } = useI18n();
  const style: Record<TradeStatus, string> = {
    pending: "bg-amber-100 text-amber-700",
    confirmed: "bg-emerald-100 text-emerald-700",
    self_reported: "bg-sky-100 text-sky-700",
    cancelled: "bg-slate-100 text-slate-500",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${style[status]}`}
    >
      {t(`tstatus.${status}` as MessageKey)}
    </span>
  );
}

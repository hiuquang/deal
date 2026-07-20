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

/** Huy hiệu VIP: vương miện 👑 + nhãn VIP. Chỉ chủ web chỉ định (cột is_vip). */
export function VipBadge() {
  const { t } = useI18n();
  return (
    <span
      className="ml-1 inline-flex items-center gap-0.5 align-middle"
      title={t("vip.label")}
      aria-label={t("vip.label")}
    >
      <span aria-hidden="true">👑</span>
      <span className="rounded bg-gradient-to-r from-amber-400 to-yellow-500 px-1 text-[10px] font-bold leading-tight text-white">
        VIP
      </span>
    </span>
  );
}

/** Tên người dùng, tự gắn huy hiệu VIP phía sau khi isVip. Dùng ở mọi chỗ hiện tên. */
export function VipName({
  name,
  isVip,
  className,
}: {
  name: string;
  isVip?: boolean;
  className?: string;
}) {
  return (
    <span className={className}>
      {name}
      {isVip && <VipBadge />}
    </span>
  );
}

/** Huy hiệu số tin chưa đọc (nav + từng dòng danh sách chat). Ẩn khi 0. */
export function UnreadBadge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={label}
      className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white"
    >
      {count > 99 ? "99+" : count}
    </span>
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

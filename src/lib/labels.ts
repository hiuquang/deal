// Formatter + danh sách key dùng chung. Nhãn hiển thị đa ngôn ngữ nằm ở
// src/lib/messages.ts (tra qua t("cond.X"), t("lstatus.X")...).
import type { Condition } from "@/lib/types";

export const SINGLE_CONDITION_KEYS: Condition[] = [
  "PSA10", "PSA9", "BGS95", "RAW_NM", "RAW_LP", "RAW_MP", "RAW_HP", "DAMAGED",
];
export const BOX_CONDITION_KEYS: Condition[] = ["BOX_SHRINK", "BOX_NO_SHRINK"];
export const CONDITION_KEYS: Condition[] = [...SINGLE_CONDITION_KEYS, ...BOX_CONDITION_KEYS];

export function formatJpy(value: number | null | undefined): string {
  if (value == null) return "—";
  return `¥${value.toLocaleString("ja-JP")}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${formatDate(iso)} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export function cardTitle(card: { nameJa: string; setCode: string; cardNumber: string }): string {
  return `${card.nameJa}（${card.setCode} ${card.cardNumber}）`;
}

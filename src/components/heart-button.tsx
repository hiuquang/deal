"use client";

// Nút ❤️ lưu/bỏ lưu 1 tin (listing hoặc buy-order). 2 biến thể:
// - overlay: nổi trên góc thẻ ảnh (trang danh sách)
// - inline: nút viền cạnh giá (trang chi tiết)
// Chưa đăng nhập → bấm điều hướng sang /login (không lưu ẩn danh).
import { useRouter } from "next/navigation";
import type { FavoriteKind } from "@/lib/types";
import { useAuth } from "@/components/auth-context";
import { useFavorites } from "@/components/favorites-context";
import { useI18n } from "@/lib/i18n";

interface Props {
  kind: FavoriteKind;
  id: string;
  variant?: "overlay" | "inline";
}

export function HeartButton({ kind, id, variant = "overlay" }: Props) {
  const { me } = useAuth();
  const { isFavorited, toggle } = useFavorites();
  const { t } = useI18n();
  const router = useRouter();
  const active = isFavorited(kind, id);

  // Thẻ nằm trong <Link> (trang danh sách) → chặn nổi bọt để bấm tim không mở tin.
  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!me) {
      router.push("/login");
      return;
    }
    void toggle(kind, id);
  }

  const label = active ? t("fav.remove") : t("fav.add");

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={active}
        aria-label={label}
        className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
          active
            ? "border-red-200 bg-red-50 text-red-600"
            : "border-slate-300 text-slate-600 hover:bg-slate-100"
        }`}
      >
        <span aria-hidden="true">{active ? "❤️" : "🤍"}</span>
        {active ? t("fav.saved") : t("fav.save")}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-base shadow-sm backdrop-blur transition hover:bg-white"
    >
      <span aria-hidden="true">{active ? "❤️" : "🤍"}</span>
    </button>
  );
}

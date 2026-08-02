"use client";

// Nút chia sẻ tin đăng. Đường lan truyền thật của chợ là người dùng dán link
// vào group Facebook/Zalo/Discord — bắt họ tự bôi đen thanh địa chỉ trên điện
// thoại là mất phần lớn lượt chia sẻ. Trên mobile mở luôn sheet chia sẻ của hệ
// điều hành; desktop (và mọi nơi không có Web Share) rơi về copy link.

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export function ShareButton({ title }: { title: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Người dùng bấm hủy sheet cũng ném AbortError — im lặng rồi thử copy.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Không có clipboard (http, quyền bị chặn): không còn cách nào tự động,
      // để nguyên nút — thanh địa chỉ vẫn là phương án thủ công.
    }
  }

  return (
    <button
      onClick={handleShare}
      className="w-full rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
    >
      {copied ? t("share.copied") : t("share.button")}
    </button>
  );
}

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

/**
 * Nút quay lại dùng chung, đặt trong layout nên mọi trang tự có — TRỪ trang
 * chủ ("/"), nơi bản thân là điểm đầu điều hướng nên không cần.
 * router.back() giữ nguyên trạng thái trang trước (vd tìm kiếm/bộ lọc ở trang
 * chủ đã đưa lên URL); mở link trực tiếp (không có lịch sử trong app) thì về "/".
 */
export function BackBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();

  if (pathname === "/") return null;

  function handleBack() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  return (
    <button
      onClick={handleBack}
      className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-indigo-700"
    >
      <span aria-hidden="true">←</span> {t("common.back")}
    </button>
  );
}

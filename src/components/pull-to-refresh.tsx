"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

/**
 * Kéo xuống để tải lại — bù cho PWA đã cài ra màn hình chính.
 *
 * Vì sao cần: chạy ở chế độ standalone thì KHÔNG còn thanh địa chỉ, nên mất
 * luôn cả nút tải lại lẫn thao tác kéo-để-làm-mới của trình duyệt. Người dùng
 * kẹt với nội dung cũ và không có cách nào làm mới ngoài việc thoát hẳn app.
 *
 * CHỈ bật ở chế độ standalone: trong tab trình duyệt bình thường (Safari,
 * Chrome) đã có sẵn cử chỉ này, bật thêm là hai cử chỉ chồng nhau.
 *
 * Trạng thái standalone được đọc NGAY LÚC chạm, không phải lúc mount — người
 * dùng có thể cài app rồi mở lại mà không remount, và cách này cũng kiểm thử
 * được bằng cách giả lập matchMedia.
 */

/** Kéo quá mốc này (sau giảm chấn) thì thả ra là tải lại. */
const NGUONG_PX = 70;
/** Trần kéo — kéo thêm nữa không dài ra, tránh cảm giác "tuột tay". */
const TOI_DA_PX = 110;
/** Giảm chấn: ngón đi 2px thì chỉ báo đi 1px, cho cảm giác có lực cản. */
const GIAM_CHAN = 0.5;

function dangChayStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari iOS dùng thuộc tính riêng, không theo chuẩn display-mode.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Có khung cuộn nào giữa điểm chạm và body đang "giữ" cử chỉ không?
 *
 * Chặn khi khung đó chưa ở đỉnh (người dùng đang cuộn nội dung bên trong), hoặc
 * khi khung tự khai `overscroll-behavior: contain/none` — đó là lời khai rõ
 * ràng "đừng lan cử chỉ ra ngoài" (khung tin nhắn chat đang dùng đúng cái này).
 */
function khungCuonDangGiuCuChi(target: EventTarget | null): boolean {
  let el = target instanceof Element ? target : null;
  while (el && el !== document.body) {
    const style = window.getComputedStyle(el);
    const troiDay = style.overflowY === "auto" || style.overflowY === "scroll";
    if (troiDay && el.scrollHeight > el.clientHeight) {
      if (el.scrollTop > 0) return true;
      const oy = style.overscrollBehaviorY;
      if (oy === "contain" || oy === "none") return true;
    }
    el = el.parentElement;
  }
  return false;
}

export function PullToRefresh() {
  const { t } = useI18n();
  const [keo, setKeo] = useState(0);
  const [dangTaiLai, setDangTaiLai] = useState(false);
  const batDauY = useRef<number | null>(null);
  const dangKeoRef = useRef(false);

  const ketThuc = useCallback(() => {
    batDauY.current = null;
    if (!dangKeoRef.current) return;
    dangKeoRef.current = false;
    setKeo((hienTai) => {
      if (hienTai >= NGUONG_PX) {
        setDangTaiLai(true);
        window.location.reload();
        return hienTai;
      }
      return 0;
    });
  }, []);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (dangTaiLai || e.touches.length !== 1) return;
      if (!dangChayStandalone()) return;
      // Chỉ nhận khi trang đã ở đỉnh và không khung con nào giữ cử chỉ.
      if (window.scrollY > 0) return;
      if (khungCuonDangGiuCuChi(e.target)) return;
      batDauY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (batDauY.current === null || dangTaiLai) return;
      const delta = e.touches[0].clientY - batDauY.current;
      if (delta <= 0) {
        // Đổi hướng sang cuộn lên → nhả cử chỉ, đừng giữ nửa vời.
        if (dangKeoRef.current) {
          dangKeoRef.current = false;
          setKeo(0);
        }
        batDauY.current = null;
        return;
      }
      dangKeoRef.current = true;
      // Chặn nảy trang của iOS để chỉ báo không giật theo.
      if (e.cancelable) e.preventDefault();
      setKeo(Math.min(delta * GIAM_CHAN, TOI_DA_PX));
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    // passive:false — cần preventDefault để chặn nảy trang.
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", ketThuc, { passive: true });
    window.addEventListener("touchcancel", ketThuc, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", ketThuc);
      window.removeEventListener("touchcancel", ketThuc);
    };
  }, [dangTaiLai, ketThuc]);

  if (keo === 0 && !dangTaiLai) return null;

  const quaNguong = keo >= NGUONG_PX;
  const nhan = dangTaiLai
    ? t("ptr.refreshing")
    : quaNguong
      ? t("ptr.release")
      : t("ptr.pull");

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center"
      style={{ transform: `translateY(${dangTaiLai ? NGUONG_PX : keo}px)` }}
    >
      <div className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-indigo-700 shadow-lg ring-1 ring-slate-200">
        <span
          aria-hidden="true"
          className={`inline-block ${dangTaiLai ? "animate-spin" : "transition-transform"}`}
          style={{ transform: dangTaiLai ? undefined : `rotate(${quaNguong ? 180 : 0}deg)` }}
        >
          {dangTaiLai ? "⟳" : "↓"}
        </span>
        {nhan}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";

/**
 * Bật/tắt thông báo đẩy cho THIẾT BỊ hiện tại (mục ở trang cá nhân).
 *
 * Đăng ký push gắn với trình duyệt+thiết bị, không gắn tài khoản — nên trạng
 * thái nút đọc từ `pushManager.getSubscription()` của máy chứ không phải từ
 * server. Mỗi lần mount, nếu máy đã có đăng ký thì gửi lại lên server (upsert)
 * để "nhận" endpoint về tài khoản đang đăng nhập — xử lý ca đổi tài khoản trên
 * cùng máy, nếu không thông báo sẽ đi nhầm người.
 *
 * iOS: Apple chỉ cấp quyền push khi web đã được cài ra màn hình chính (PWA).
 * Trong tab Safari thường, `PushManager` không tồn tại → ta hiện hướng dẫn cài
 * thay vì nút bấm chết.
 */

/** Khoá VAPID truyền cho trình duyệt phải là Uint8Array, không phải base64url. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/** Đã mở từ biểu tượng màn hình chính (chế độ app) hay còn trong tab trình duyệt. */
function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari iOS dùng thuộc tính riêng, không theo chuẩn display-mode.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

type State = "loading" | "unsupported" | "need-install" | "off" | "on";

export function PushToggle() {
  const { t } = useI18n();
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      // Chủ web chưa cấu hình VAPID → ẩn hẳn mục này (giữ "loading" là ẩn).
      let key: string | null = null;
      try {
        key = (await api.getPushPublicKey()).publicKey;
      } catch {
        return;
      }
      if (cancelled || !key) return;
      setPublicKey(key);

      const supported = "serviceWorker" in navigator && "PushManager" in window;
      if (!supported) {
        // iPhone trong tab Safari: chưa cài PWA nên chưa có PushManager — đây là
        // trạng thái sửa được, khác hẳn "trình duyệt không hỗ trợ".
        setState(isIos() && !isStandalone() ? "need-install" : "unsupported");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const existing = await registration.pushManager.getSubscription();
        if (cancelled) return;
        if (existing) {
          // Nhận lại endpoint về tài khoản đang đăng nhập (xem chú thích đầu file).
          const json = existing.toJSON() as { keys?: { p256dh?: string; auth?: string } };
          if (json.keys?.p256dh && json.keys.auth) {
            await api
              .subscribePush({
                endpoint: existing.endpoint,
                keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
              })
              .catch(() => {});
          }
          if (!cancelled) setState("on");
        } else {
          setState("off");
        }
      } catch {
        if (!cancelled) setState("unsupported");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async () => {
    if (!publicKey) return;
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError(t("push.denied"));
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        // Bắt buộc true: trình duyệt chỉ cho push có hiện thông báo cho người
        // dùng thấy (không cho push ngầm).
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      const json = subscription.toJSON() as { keys?: { p256dh?: string; auth?: string } };
      if (!json.keys?.p256dh || !json.keys.auth) {
        setError(t("push.failed"));
        return;
      }
      await api.subscribePush({
        endpoint: subscription.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
      setState("on");
    } catch {
      setError(t("push.failed"));
    } finally {
      setBusy(false);
    }
  }, [publicKey, t]);

  const disable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // Xoá ở server TRƯỚC: nếu unsubscribe phía trình duyệt xong mới gọi API
        // mà API lỗi, ta mất endpoint và bản ghi chết nằm lại DB mãi.
        await api.unsubscribePush(subscription.endpoint).catch(() => {});
        await subscription.unsubscribe();
      }
      setState("off");
    } catch {
      setError(t("push.failed"));
    } finally {
      setBusy(false);
    }
  }, [t]);

  // Chưa cấu hình VAPID / đang dò → không chiếm chỗ trên trang.
  if (state === "loading") return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="font-bold">🔔 {t("push.title")}</h2>
      <p className="mt-1 text-sm text-slate-600">{t("push.hint")}</p>

      {state === "need-install" && (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-900">{t("push.iosTitle")}</p>
          <p className="mt-1 text-sm text-amber-800">{t("push.iosHint")}</p>
        </div>
      )}

      {state === "unsupported" && (
        <p className="mt-3 text-sm text-slate-500">{t("push.unsupported")}</p>
      )}

      {(state === "off" || state === "on") && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={state === "on" ? disable : enable}
            disabled={busy}
            className={
              state === "on"
                ? "rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                : "rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            }
          >
            {busy ? t("push.working") : state === "on" ? t("push.disable") : t("push.enable")}
          </button>
          {state === "on" && (
            <span className="text-sm font-medium text-emerald-700">{t("push.enabled")}</span>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-slate-500">{t("push.perDevice")}</p>
    </section>
  );
}

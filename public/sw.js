/**
 * Service worker của DEAL — chỉ phục vụ thông báo đẩy (Web Push).
 * KHÔNG cache tài nguyên: web dựa vào SSR/ISR của Next, thêm cache ở đây sẽ
 * sinh trạng thái cũ khó gỡ. Nếu sau này muốn offline, làm ở file riêng.
 *
 * Vòng đời: đăng ký từ push-toggle (client) → skipWaiting + clients.claim để
 * bản mới thay ngay bản cũ, tránh cảnh 2 phiên bản SW cùng tồn tại sau deploy.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Server gửi payload JSON: { title, body, url, tag }.
 * `tag` gộp thông báo cùng nguồn (vd nhiều tin nhắn trong 1 hội thoại chỉ hiện
 * 1 dòng, không dội hàng chục thông báo). Payload hỏng vẫn phải hiện một thông
 * báo gì đó — iOS/Chrome phạt (huỷ đăng ký) service worker nhận push mà im lặng.
 */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || "DEAL";
  const options = {
    body: data.body || "Bạn có hoạt động mới.",
    icon: "/icon-192.png",
    badge: "/badge-96.png",
    tag: data.tag || "deal-notification",
    renotify: true,
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * Bấm vào thông báo: nếu web đã mở sẵn ở tab nào đó thì focus + điều hướng tab
 * đó (tránh mở thêm cửa sổ trùng), chưa mở thì mở mới.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin);

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (new URL(client.url).origin === target.origin && "focus" in client) {
          client.navigate(target.href);
          return client.focus();
        }
      }
      return self.clients.openWindow(target.href);
    })
  );
});

/**
 * Trình duyệt xoay vòng khoá đăng ký (hiếm, nhưng có). Không xử lý thì thiết bị
 * lặng lẽ ngừng nhận thông báo. Ta báo cho các tab đang mở để client đăng ký lại.
 */
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        client.postMessage({ type: "push-subscription-expired" });
      }
    })
  );
});

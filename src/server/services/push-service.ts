import webpush from "web-push";
import * as pushRepo from "@/server/repositories/push-subscriptions";

/**
 * Thông báo đẩy (Web Push) — đẩy tin nhắn/hoạt động lên màn hình điện thoại kể
 * cả khi người dùng không mở web.
 *
 * Nguyên tắc: gửi push KHÔNG BAO GIỜ được làm hỏng hành động chính. Người ta
 * gửi tin nhắn thì tin nhắn phải lưu xong và trả 200, dù Apple/Google có sập.
 * Vì vậy mọi lỗi ở đây đều nuốt + log, và điểm gọi dùng `notify()` (fire-and-
 * forget), không `await`.
 *
 * iOS: chỉ nhận được push khi user đã "Thêm vào màn hình chính" (PWA, iOS
 * 16.4+). Safari trong tab thường không hỗ trợ — đó là giới hạn của Apple.
 */

export type PushPayload = {
  title: string;
  body: string;
  /** Đường dẫn nội bộ mở ra khi bấm vào thông báo (vd `/chat?c=<id>`). */
  url: string;
  /**
   * Gộp thông báo cùng nguồn: 10 tin nhắn trong 1 hội thoại chỉ hiện 1 dòng
   * (đè lên nhau) thay vì dội 10 thông báo. Đặt theo hội thoại/tin đăng.
   */
  tag: string;
};

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || "mailto:bui.hieu98761@gmail.com";

/**
 * Thiếu khoá VAPID → tính năng tự tắt êm (UI ẩn nút bật thông báo, server không
 * gửi gì). Web vẫn chạy bình thường — quan trọng cho môi trường dev của người
 * khác clone repo về mà chưa sinh khoá.
 */
export function isConfigured(): boolean {
  return Boolean(publicKey && privateKey);
}

/**
 * `??` không đủ: biến env đặt rỗng trên Vercel cho ra `""` chứ không phải
 * undefined — phải bám theo isConfigured() để client luôn nhận null khi tính
 * năng tắt, thay vì khoá rỗng trông như đã cấu hình.
 */
export function getPublicKey(): string | null {
  return isConfigured() ? publicKey! : null;
}

let vapidReady = false;
function ensureVapid() {
  if (vapidReady || !publicKey || !privateKey) return;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidReady = true;
}

/**
 * Gửi tới MỌI thiết bị của một user. Trả về số thiết bị nhận thành công (dùng
 * cho test và log; điểm gọi không cần quan tâm).
 *
 * Endpoint trả 404/410 = người dùng đã gỡ app/xoá đăng ký ở phía trình duyệt →
 * xoá bản ghi luôn, nếu không bảng sẽ phình mãi và mỗi lần gửi lại tốn 1 request
 * chết. Lỗi khác (mạng, 5xx của Apple) thì GIỮ bản ghi — có thể chỉ là tạm thời.
 */
export async function sendToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!isConfigured()) return 0;
  ensureVapid();

  const subscriptions = await pushRepo.listForUser(userId);
  if (subscriptions.length === 0) return 0;

  const body = JSON.stringify(payload);
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        );
        sent += 1;
      } catch (error: unknown) {
        const status = (error as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await pushRepo.removeDead(sub.endpoint);
          console.log(`[push] dọn đăng ký chết của user ${userId} (status ${status})`);
        } else {
          console.error(`[push] gửi thất bại cho user ${userId} (status ${status ?? "?"})`);
        }
      }
    })
  );

  return sent;
}

/**
 * Bản fire-and-forget dùng ở các service nghiệp vụ: không await, không ném lỗi.
 *
 * Payload truyền vào dạng HÀM chứ không phải object là có chủ đích: nội dung
 * thông báo hay đọc field lồng nhau (`listing.card.nameJa`), nếu dựng payload
 * ném lỗi ngay tại điểm gọi thì cả hành động chính sập theo — đúng thứ tầng này
 * cam kết không bao giờ để xảy ra. Bọc trong hàm để lỗi rơi vào try dưới đây.
 */
export function notify(userId: string, buildPayload: () => PushPayload): void {
  let payload: PushPayload;
  try {
    payload = buildPayload();
  } catch (error) {
    console.error("[push] không dựng được nội dung thông báo:", error);
    return;
  }
  void sendToUser(userId, payload).catch((error) => {
    console.error("[push] lỗi ngoài dự kiến khi gửi thông báo:", error);
  });
}

/** Cắt nội dung dài cho gọn dòng thông báo trên màn hình khoá. */
export function preview(text: string, max = 120): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

# Thông báo đẩy (Web Push)

Đẩy tin nhắn / hoạt động lên **màn hình điện thoại** kể cả khi người dùng không mở web. Có từ v0.22.0.

## Giới hạn nền tảng — đọc trước

| Nền tảng | Tình trạng |
|---|---|
| Android (Chrome), desktop (Chrome/Edge/Firefox) | Chạy trực tiếp trong tab. Chỉ cần cho phép thông báo. |
| **iPhone / iPad (Safari)** | **CHỈ chạy khi web đã được "Thêm vào màn hình chính"** (cài như app, iOS 16.4+). Trong tab Safari thường, `window.PushManager` KHÔNG tồn tại. |

Đây là giới hạn của Apple, **không có cách lách**. UI xử lý bằng cách nhận diện iOS chưa cài PWA (`push.iosHint`) và hiện hướng dẫn cài thay vì một cái nút bấm không ăn.

## Cấu hình

3 biến env (xem `.env.example`). **Thiếu `VAPID_PUBLIC_KEY` hoặc `VAPID_PRIVATE_KEY` → tính năng tự tắt êm**: `/api/push/public-key` trả `null`, UI ẩn hẳn mục bật thông báo, server không gửi gì. Web chạy bình thường.

```bash
node -e "console.log(require('web-push').generateVAPIDKeys())"
```

- `VAPID_PUBLIC_KEY` — công khai theo thiết kế, client cần để đăng ký.
- `VAPID_PRIVATE_KEY` — **bí mật**, không commit.
- `VAPID_SUBJECT` — `mailto:...`, để nhà cung cấp push liên hệ khi có sự cố.

⚠️ Đổi cặp khoá = **mọi đăng ký cũ chết** (Apple/Google từ chối chữ ký mới trên endpoint cũ), toàn bộ user phải bật lại. Cặp khoá trên Vercel và trên máy dev phải **giống nhau** nếu muốn test cùng một thiết bị.

## Kiến trúc

```
sự kiện nghiệp vụ (chat / 購入希望 / chào bán / bình luận)
  └─ pushService.notify(userId, () => payload)   ← fire-and-forget, KHÔNG await
       └─ sendToUser: đọc mọi thiết bị của user → web-push → Apple/Google
            └─ trình duyệt đánh thức /sw.js → showNotification
```

### Bất biến: push KHÔNG BAO GIỜ được làm hỏng hành động chính

Người dùng gửi tin nhắn thì tin nhắn phải lưu xong và trả 200, dù Apple/Google có sập. Vì vậy:

- `notify()` nhận **hàm dựng payload**, không phải object. Nội dung thông báo hay đọc field lồng nhau (`listing.card.nameJa`); nếu dựng payload ném lỗi ngay tại điểm gọi thì cả hành động chính sập theo. Bọc trong hàm để lỗi rơi vào `try` của service. **Đừng "đơn giản hoá" ngược lại thành object.**
- Mọi lỗi gửi đều bị nuốt + log, không `await` ở điểm gọi.

### Dọn đăng ký chết

Endpoint trả **404/410** = user gỡ app / xoá đăng ký ở phía trình duyệt → xoá bản ghi ngay, nếu không bảng phình mãi và mỗi lần gửi tốn thêm 1 request chết. Lỗi khác (5xx, timeout) thì **giữ** bản ghi — có thể chỉ tạm thời.

### Gộp thông báo bằng `tag`

`tag` đặt theo nguồn (`chat-<convId>`, `request-<listingId>`…) → 10 tin nhắn liên tiếp trong 1 hội thoại đè lên nhau thành 1 dòng thay vì dội 10 thông báo.

## Dữ liệu

Bảng `push_subscriptions` — **một bản ghi = một thiết bị**, không phải một user:

- `endpoint` (unique) do trình duyệt cấp, là định danh thiết bị và là key upsert.
- Bật lại trên cùng máy → upsert đè, không sinh rác.
- Đổi tài khoản trên cùng trình duyệt → `userId` bị ghi đè để thông báo đi đúng người. Client gửi lại subscription mỗi lần mount `PushToggle` chính là để "nhận lại" endpoint này.

## API

| Endpoint | Auth | Ghi chú |
|---|---|---|
| `GET /api/push/public-key` | không | `{ publicKey: string \| null }`. `null` = chưa cấu hình. |
| `POST /api/push/subscribe` | có | Idempotent (upsert theo endpoint). Body `{ endpoint, keys: { p256dh, auth } }`. |
| `DELETE /api/push/subscribe` | có | Body `{ endpoint }`. Chỉ tắt thiết bị hiện tại. |

## Sự kiện có push

| Sự kiện | Người nhận | Mở tới |
|---|---|---|
| Tin nhắn chat mới | bên còn lại của hội thoại | `/chat?c=<id>` |
| 購入希望 (yêu cầu mua) | chủ tin đăng | `/listings/<id>` |
| Chào bán vào tin đăng mua | chủ tin đăng mua | `/buy-orders/<id>` |
| Bình luận vào tin | chủ tin (bỏ qua khi tự bình luận) | `/listings/<id>` |

Chốt giá / nhắc đánh giá **cố ý chưa có** — chủ web chọn 3 nhóm trên để tránh làm phiền.

## Service worker

`public/sw.js` — **chỉ phục vụ push, KHÔNG cache tài nguyên**. Web dựa vào SSR/ISR của Next; thêm cache ở đây sẽ sinh trạng thái cũ rất khó gỡ. Muốn offline thì làm file riêng.

`skipWaiting` + `clients.claim` để bản mới thay ngay bản cũ sau deploy.

## Gotcha

- **Bắt buộc HTTPS** (localhost được miễn). Không có trên HTTP thường.
- **Không test được bằng browser tự động**: quyền thông báo bị từ chối mặc định trong môi trường headless/automation. Round-trip thật phải thử trên máy/điện thoại thật.
- iOS chỉ hiện lời mời "Thêm vào MH chính" trong **Safari** — Chrome trên iPhone không cài PWA được.
- Next 15 phát thẻ chuẩn mới `mobile-web-app-capable`; layout khai thêm tay `apple-mobile-web-app-capable` cho iOS đời cũ (thiếu nó, icon màn hình chính mở ra tab Safari thường → không nhận được push).

## Kéo xuống để tải lại (v0.25.0)

PWA chạy standalone **không có thanh địa chỉ** → mất luôn nút tải lại lẫn cử chỉ kéo-để-làm-mới của trình duyệt; người dùng kẹt với nội dung cũ. `components/pull-to-refresh.tsx` bù lại phần đó.

- **CHỈ bật ở standalone.** Trong tab trình duyệt đã có sẵn cử chỉ này — bật thêm là hai cử chỉ chồng nhau.
- Trạng thái standalone đọc **ngay lúc chạm**, không phải lúc mount: user có thể cài app rồi mở lại mà component không remount, và cách này kiểm thử được bằng cách giả lập `matchMedia`.
- Không cướp cử chỉ khi: trang chưa ở đỉnh, hoặc có khung cuộn cha chưa ở đỉnh, hoặc khung cha khai `overscroll-behavior: contain/none` (khung tin nhắn chat đang dùng đúng cái này — **giữ nguyên nếu thêm khung cuộn mới nào không muốn bị cướp**).
- Ngưỡng 70px sau giảm chấn 0.5, trần 110px. `overscroll-behavior-y: contain` trên body chỉ áp trong `@media (display-mode: standalone)`.

# API — Conversations & Messages (chat)

Quy ước chung: [README.md](README.md).

> **P3**: `POST /api/conversations` đã bị GỠ — conversation chỉ được tạo qua `POST /api/requests/:id/connect` (xem [purchase-requests.md](purchase-requests.md)).

Chat dùng **polling thông minh** (không WebSocket — roadmap: Supabase Realtime), incremental qua `?after=`. Nhịp poll tự điều chỉnh theo mức tương tác (gõ/chạm/cuộn/gửi/nhận tin, xem `chat-panel.tsx`): tương tác trong 1 phút gần nhất → **5s**; im ắng 1–5 phút → **15s**; treo >5 phút → **60s**. Đối phương nhắn tới hoặc quay lại tab → về ngay nhịp 5s. Client chỉ poll khi tab đang hiển thị (`visibilitychange`), quay lại tab thì poll bù ngay; poll unread ở nav (15s) cũng chỉ chạy khi tab hiển thị. Trường hợp xấu nhất khi cả 2 bên treo tab >5 phút: tin đầu tiên trễ tối đa ~60s (badge nav báo song song).

### GET /api/conversations

→ `{conversations: [...]}` — của tôi; mỗi phần tử kèm `listing`, `otherPartyName`, `lastMessage`, `activeTradeId`, `unreadCount` (số tin chưa đọc của riêng hội thoại đó — cùng quy tắc đếm với `unread-count` bên dưới, kể cả "tối thiểu 1 khi chưa mở"; huy hiệu từng dòng trong danh sách chat).

### GET /api/conversations/:id/messages?after=<messageId>

`after`: chỉ lấy tin nhắn mới hơn message id đó (polling incremental — client append, chú ý không append trùng). Lỗi: `403` (không phải thành viên), `404`.

### POST /api/conversations/:id/messages (cần verified)

```json
{ "body": "12,345円でどうですか？" }
```

`body` 1–1000 ký tự → `201 {message}`. Lỗi: `400`, `403`. Gửi tin cũng đánh dấu người gửi đã đọc hội thoại.

### GET /api/conversations/unread-count

→ `{count, activityCount}` — số liệu cho badge ở nav, gộp 1 endpoint vì bị poll định kỳ (tách riêng = nhân đôi request). `count`: tổng tin chat chưa đọc (mỗi hội thoại đếm tin bên kia gửi sau mốc đã đọc; chưa mở lần nào tính tối thiểu 1). `activityCount`: hoạt động mới trên tin của mình — xem `GET /api/activity` bên dưới. Nav poll ~15s (chỉ khi tab hiển thị) + refetch khi focus/đổi route/sự kiện `deal:unread`.

### GET /api/activity

→ `{items: [...], newCount}` — hoạt động trên tin của viewer, mới nhất trước (derived, không có bảng notification): bình luận của người khác vào tin mình (`kind:"comment"`, 20 gần nhất), 購入希望 đang pending (`kind:"request"`), chào bán pending trên tin gom của mình (`kind:"offer"`). Mỗi item: `targetId` (listingId hoặc buyOrderId để dựng link), `cardNameJa`, `actorName/actorIsVip`, `body` (comment), `quantity` (offer), `isNew` (sau mốc `users.activity_seen_at` — mốc null thì tất cả là mới), `createdAt`. Request/offer pending nằm trong danh sách tới khi chủ tin 連携 — `isNew` chỉ quyết định highlight + badge.

### POST /api/activity/read

Ghi mốc đã xem (= now) → `{ok:true}`, badge `activityCount` về 0. Trang cá nhân gọi khi mở.

### Vòng đời chat — tự xóa sau giao dịch (v0.16.0)

Khi trade chốt (confirmed/self_reported) **và CẢ 2 bên đã đánh giá**, rating thứ 2 đặt `conversations.messages_purge_at = now + 1 ngày` (repo `setMessagesPurgeAt`, chỉ đặt khi null → idempotent). **Sweep lazy** ở `chat-service.purgeExpiredChatsThrottled()` (throttle 1 lần/phút/process, gọi trong `listMine` — KHÔNG cron, giống auto-close trade): xóa **nội dung tin nhắn** của hội thoại tới hạn (`messages_purge_at <= now AND messages_purged_at IS NULL`), ghi `messages_purged_at`. **Giữ conversation shell + trade + price_records** — chỉ nội dung `messages` biến mất. `ConversationDto.messagesPurged=true` → UI hiện "このチャットは削除されました", ẩn ô nhập, không poll. Rating không hoàn tất (1 bên không đánh giá) → không đặt hạn → chat không bị xóa.

**Đánh giá bắt buộc**: sau khi chốt giá, form đánh giá trong chat là bước bắt buộc (banner 必須, không có nút bỏ qua) — nhắc dai trong chat, không chặn phần còn lại của web. Xem [ratings-reports-users.md](ratings-reports-users.md).

### POST /api/conversations/:id/read

Đánh dấu hội thoại đã đọc cho viewer (mốc = now) → `{ok:true}`. Client gọi khi mở/đang xem hội thoại. Lỗi: `403`, `404`.

**Read-tracking**: `conversations.buyer_last_read_at` / `seller_last_read_at` (null = chưa mở). Seller connect tạo hội thoại → `seller_last_read_at = now`, buyer null (để báo match).

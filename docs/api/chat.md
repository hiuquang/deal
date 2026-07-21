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

→ `{count}` — tổng tin chưa đọc của viewer (huy hiệu đỏ ở nav). Mỗi hội thoại: đếm tin của bên kia gửi sau mốc đã đọc của mình; hội thoại chưa mở lần nào (vừa được match) tính tối thiểu 1. Nav poll ~15s + refetch khi focus/đổi route/sự kiện `deal:unread`.

### POST /api/conversations/:id/read

Đánh dấu hội thoại đã đọc cho viewer (mốc = now) → `{ok:true}`. Client gọi khi mở/đang xem hội thoại. Lỗi: `403`, `404`.

**Read-tracking**: `conversations.buyer_last_read_at` / `seller_last_read_at` (null = chưa mở). Seller connect tạo hội thoại → `seller_last_read_at = now`, buyer null (để báo match).

# API — Conversations & Messages (chat)

Quy ước chung: [README.md](README.md).

> **P3**: `POST /api/conversations` đã bị GỠ — conversation chỉ được tạo qua `POST /api/requests/:id/connect` (xem [purchase-requests.md](purchase-requests.md)).

Chat dùng **polling 6s**, incremental qua `?after=` (không WebSocket). Client chỉ poll khi tab đang hiển thị (`visibilitychange`), quay lại tab thì poll bù ngay.

### GET /api/conversations

→ `{conversations: [...]}` — của tôi; mỗi phần tử kèm `listing`, `otherPartyName`, `lastMessage`, `activeTradeId`.

### GET /api/conversations/:id/messages?after=<messageId>

`after`: chỉ lấy tin nhắn mới hơn message id đó (polling incremental — client append, chú ý không append trùng). Lỗi: `403` (không phải thành viên), `404`.

### POST /api/conversations/:id/messages (cần verified)

```json
{ "body": "12,345円でどうですか？" }
```

`body` 1–1000 ký tự → `201 {message}`. Lỗi: `400`, `403`.

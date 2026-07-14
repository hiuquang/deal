# API — Purchase Requests (luồng mua 購入希望 → 連携, P3)

Quy ước chung: [README.md](README.md).

Thay thế hoàn toàn chat trực tiếp (`POST /api/conversations` đã bị GỠ):

```
Buyer bấm 購入希望 → seller thấy danh sách người muốn mua (kèm ★ uy tín)
  → seller bấm 連携する với người mình chọn → tạo conversation riêng
  → 2 bên chat riêng → trade như cũ
```

Seller toàn quyền chọn đối tác — đây là bất biến nghiệp vụ (xem [business-rules.md](../business-rules.md) mục 12).

### POST /api/listings/:id/requests (buyer, cần verified)

→ `201 {request}` (status `pending`). Lỗi: `409 OWN_LISTING` (tự mua của mình), `409 NOT_ACTIVE`, `409 ALREADY_REQUESTED` (unique listing+buyer).

### GET /api/listings/:id/requests (CHỈ seller — 403 với người khác)

```json
{ "requests": [{ "id": "...", "buyerId": "...", "buyerDisplayName": "Buyer",
  "buyerRatingAvg": 4.5, "buyerRatingCount": 2, "buyerContributionCount": 3,
  "status": "pending", "conversationId": null, "createdAt": "..." }] }
```

`conversationId` khác null khi đã connect.

### GET /api/listings/:id/requests/me

→ `{request: ...|null}` — trạng thái request của chính viewer trên listing này.

### POST /api/requests/:id/connect (CHỈ seller, idempotent)

→ `{request, conversationId}` — tạo/mở conversation riêng (unique listing+buyer), request → `connected`. Lỗi: `403`, `404`.

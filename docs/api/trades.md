# API — Trades (trái tim của app)

Quy ước chung: [README.md](README.md). Bất biến nghiệp vụ liên quan: [business-rules.md](../business-rules.md) mục 1, 2, 5, 8–10, 12b.

Trade đến từ 1 trong 2 nguồn (suy từ conversation):
- **listing** (mua thường): giá = giá thẻ, quantity luôn 1, condition lấy từ listing.
- **buy-order** (tin gom, P9): `finalPriceJpy` là **ĐƠN GIÁ** (giá/1 bản); bên khởi tạo khai thêm `condition` + `quantity`. `price_records.price_jpy` ghi đơn giá → so sánh được giữa mọi giao dịch.

Trạng thái: `pending` → `confirmed` (2 bên xác nhận) | `self_reported` (quá 7 ngày im lặng, tự chốt lazy-check) | `cancelled`.
Khi trade sang `confirmed`/`self_reported` → tạo **đúng 1** `price_record` (đơn giá). **Listing KHÔNG đóng ở bước này (v0.19.0)** — tin đăng giữ `active` suốt quá trình trade và chỉ `closed` sau khi cả 2 đã đánh giá (mốc đóng ở rating-service; xem business-rules #9b). Tin gom cũng KHÔNG tự đóng (chủ tin gom từ nhiều người bán).

### POST /api/trades (cần verified)

```json
{ "conversationId": "cm...", "finalPriceJpy": 12345 }
// conversation từ tin gom: thêm 2 trường bắt buộc
{ "conversationId": "cm...", "finalPriceJpy": 75000, "condition": "RAW_NM", "quantity": 8 }
```

Người gọi = bên khởi tạo (được tính là đã xác nhận); buyer/seller suy ra từ conversation. Giá 1 ~ 10.000.000 JPY, quantity 1 ~ 999. Trade kiểu trao đổi vẫn nhập giá trị quy đổi JPY. `condition` phải khớp category của thẻ (`400 CONDITION_MISMATCH`).

→ `201 {trade}`. Lỗi: `400` (giá/số lượng ngoài khoảng, thiếu condition/quantity với buy-order, condition lệch loại), `403` (không phải thành viên conversation), `409 TRADE_EXISTS` (listing/hội thoại đã có trade chưa cancelled — ép ở DB bằng 2 partial unique index `trades_one_active_per_listing` + `trades_one_active_per_conversation`), `409 NOT_ACTIVE` (tin gom đã đóng).

```json
// TradeDto
{ "id": "...", "kind": "listing|buy_order", "listing": {...}|null, "card": {...},
  "condition": "RAW_NM", "quantity": 1, "conversationId": "...", "buyerId": "...",
  "sellerId": "...", "initiatorId": "...", "counterpartName": "Taro",
  "finalPriceJpy": 12345, "status": "pending", "autoCloseAt": "2026-07-18T...",
  "confirmedAt": null, "createdAt": "..." }
```

### GET /api/trades

→ `{trades: [...]}` (tôi là buyer/seller). **Endpoint này cũng lazy-check auto-close** (trade pending quá `autoCloseAt` → `self_reported` + tạo price_record).

### GET /api/trades/:id → `{trade}` — `403`, `404`

### POST /api/trades/:id/confirm

```json
{ "finalPriceJpy": 12345 }
// trade buy-order: phải nhập lại cả số lượng
{ "finalPriceJpy": 75000, "quantity": 8 }
```

Chỉ bên KHÔNG khởi tạo. Giá (và số lượng, với trade buy-order) phải **khớp tuyệt đối** với bên kia đã khai — bên xác nhận không được thấy các giá trị đó (chống khai láo). Condition do bên khởi tạo khai được hiển thị (không phải nhập lại); sai thì hủy trade và khai lại.

Lỗi: `409 WAITING_COUNTERPART` (initiator tự confirm), `409 PRICE_MISMATCH` (lệch giá), `409 QUANTITY_MISMATCH` (lệch số lượng — 2 bên tự thống nhất lại trong chat), `409 ALREADY_CONFIRMED`, `403`, `404`.

### POST /api/trades/:id/cancel

Chỉ khi `pending`, chỉ 1 trong 2 bên; listing (nếu có) mở lại `active`. Lỗi: `409 INVALID_STATUS`, `403`.

# API — Trades (trái tim của app)

Quy ước chung: [README.md](README.md). Bất biến nghiệp vụ liên quan: [business-rules.md](../business-rules.md) mục 1, 2, 5, 8–10.

Trạng thái: `pending` → `confirmed` (2 bên xác nhận) | `self_reported` (quá 7 ngày im lặng, tự chốt lazy-check) | `cancelled`.
Khi trade sang `confirmed`/`self_reported` → tạo **đúng 1** `price_record` + listing sang `closed`.

### POST /api/trades (cần verified)

```json
{ "conversationId": "cm...", "finalPriceJpy": 12345 }
```

Người gọi = bên khởi tạo (được tính là đã xác nhận); buyer/seller/listing suy ra từ conversation. Giá 1 ~ 10.000.000 JPY. Trade kiểu trao đổi vẫn nhập giá trị quy đổi JPY.

→ `201 {trade}`. Lỗi: `400` (giá ngoài khoảng), `403` (không phải thành viên conversation), `409 TRADE_EXISTS` (listing đã có trade chưa cancelled).

```json
// TradeDto
{ "id": "...", "listing": {...}, "conversationId": "...", "buyerId": "...", "sellerId": "...",
  "initiatorId": "...", "counterpartName": "Taro", "finalPriceJpy": 12345,
  "status": "pending", "autoCloseAt": "2026-07-18T...", "confirmedAt": null, "createdAt": "..." }
```

### GET /api/trades

→ `{trades: [...]}` (tôi là buyer/seller). **Endpoint này cũng lazy-check auto-close** (trade pending quá `autoCloseAt` → `self_reported` + tạo price_record).

### GET /api/trades/:id → `{trade}` — `403`, `404`

### POST /api/trades/:id/confirm

```json
{ "finalPriceJpy": 12345 }
```

Chỉ bên KHÔNG khởi tạo. Giá phải **khớp tuyệt đối** với giá bên kia đã khai — bên xác nhận không được thấy giá đó (chống khai láo).

Lỗi: `409 WAITING_COUNTERPART` (initiator tự confirm), `409 PRICE_MISMATCH` (lệch giá — 2 bên tự thống nhất lại trong chat), `409 ALREADY_CONFIRMED`, `403`, `404`.

### POST /api/trades/:id/cancel

Chỉ khi `pending`, chỉ 1 trong 2 bên; listing mở lại `active`. Lỗi: `409 INVALID_STATUS`, `403`.

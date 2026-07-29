# API — Buy Orders ("Đăng mua": tin của người MUỐN MUA, Giai đoạn 1)

Quy ước chung: [README.md](README.md).

Luồng **đảo chiều** so với listing: người *mua* đăng nhu cầu → người *bán* chào bán công khai → người mua chọn 1 người bán → chat riêng.

```
Buyer đăng tin gom (thẻ + số lượng + đơn giá tối đa)
  → Seller xem, đăng "chào bán" công khai (số lượng bán được + lời nhắn)
  → Buyer (chủ tin) thấy danh sách chào bán kèm ★ uy tín → bấm 連携
  → tạo conversation riêng → chat riêng
```

Từ **Giai đoạn 2 (P9)**: chat riêng của buy-order chốt trade + ghi giá được — bên khởi tạo khai **đơn giá + số lượng + condition** (tin gom không khai condition); bên xác nhận nhập lại đúng đơn giá + số lượng. Chi tiết: [trades.md](trades.md).

### GET /api/buy-orders

Query: `q` (tên/set/số thẻ), `game`, `category`, `cardId`, `page`, `mine=1` (tin của tôi, mọi trạng thái). Mặc định chỉ `status=active`.

```json
{ "buyOrders": [{ "id": "...", "card": { ... }, "buyerId": "...",
  "buyerDisplayName": "Buyer", "quantity": 20, "maxUnitPriceJpy": 80000,
  "imageUrl": null,
  "status": "active", "offerCount": 1, "createdAt": "..." }], "total": 1 }
```

### POST /api/buy-orders (cần verified)

Body: `{ cardId, quantity (1..999), maxUnitPriceJpy? (1..10tr, null), imageUrl? (URL ảnh đã upload qua /api/uploads, tùy chọn/null — validate isOwnImageUrl) }` → `201 {buyOrder}`. Lỗi: `404 CARD_NOT_FOUND`.

### GET /api/buy-orders/:id → `{buyOrder}` (công khai). `404 NOT_FOUND`.

### POST /api/buy-orders/:id/cancel (CHỈ chủ tin)

→ `{buyOrder}` status `cancelled`. Lỗi: `403 FORBIDDEN`, `409 INVALID_STATUS` (đã hủy).

### GET /api/buy-orders/:id/offers (công khai)

```json
{ "offers": [{ "id": "...", "buyOrderId": "...", "sellerId": "...",
  "sellerDisplayName": "Seller", "sellerRatingAvg": 5.0, "sellerRatingCount": 1,
  "sellerContributionCount": 34, "quantity": 8, "message": "...",
  "status": "pending", "conversationId": null, "createdAt": "..." }] }
```

### POST /api/buy-orders/:id/offers (seller, cần verified)

Body: `{ quantity (1..999), message? (≤300) }` → `201 {offer}`. Lỗi: `409 OWN_ORDER` (chủ tin tự chào bán), `409 NOT_ACTIVE`, `409 ALREADY_OFFERED` (unique buyOrder+seller).

### POST /api/buy-orders/offers/:offerId/connect (CHỈ chủ tin, idempotent)

→ `{offer, conversationId}` — tạo/mở conversation riêng (unique buyOrder+seller), offer → `connected`. Lỗi: `403 FORBIDDEN`, `404`.

## Bình luận công khai (v0.24.0)

Đối xứng hoàn toàn với bình luận trên tin bán — hỏi đáp **trước** khi chào bán / kết nối, ai cũng đọc được.

### GET /api/buy-orders/:id/comments (công khai, không cần đăng nhập)

→ `{comments: CommentDto[]}` — cũ → mới, tối đa 200. Lỗi: `404` (tin đăng mua không tồn tại).

### POST /api/buy-orders/:id/comments (cần đăng nhập + đã xác nhận email)

Body: `{ body (1..500) }` → `201 {comment}`. Lỗi: `401`, `403` (chưa xác nhận email / chưa đồng ý điều khoản), `404`.

Gửi push cho **chủ tin đăng mua** = `buy_orders.buyer_id` (luồng đảo chiều — KHÔNG phải seller), bỏ qua khi chủ tin tự bình luận. Bình luận cũng vào mục 🔔 hoạt động của chủ tin; `ActivityItemDto.targetKind` cho biết dựng link `/listings/` hay `/buy-orders/`.

`CommentDto` có **cả `listingId` lẫn `buyOrderId`, đúng 1 khác null** — xem [../data-model.md](../data-model.md).

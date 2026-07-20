# API — Listings & Comments

Quy ước chung: [README.md](README.md).

## Listings

### GET /api/listings?q=&game=&cardId=&status=&page=&mine=&category=

- Mặc định `status=active`, 20 kết quả/trang.
- Thứ tự (0.12.1): **tin của người bán VIP trước** (`seller.isVip desc`), trong mỗi nhóm mới nhất trước (`createdAt desc`). Đặc quyền VIP — xem CHANGELOG 0.12.0.
- `q` (≤100 ký tự): tìm sản phẩm — khớp `contains` trên tên JP/EN, set, số thẻ của card liên kết (cùng cách với autocomplete `/api/cards`) **HOẶC** tên ga gần nhất (`station`) của tin.
- `mine=1`: chỉ listing của tôi, mọi status (cần đăng nhập).
- `category=single|box` (P3).

```json
{ "listings": [ { "id": "...", "card": {...}, "sellerId": "...", "sellerDisplayName": "Taro",
  "condition": "PSA10", "imageUrl": "/uploads/....jpg", "askingPriceJpy": 98000,
  "tradeType": "sell", "station": "新宿駅", "note": "白かけなし", "status": "active",
  "createdAt": "2026-07-11T..." } ],
  "total": 10 }
```

### POST /api/listings (cần đăng nhập + verified)

```json
{ "cardId": "cm...", "condition": "RAW_NM", "imageUrl": "/uploads/xxx.jpg",
  "askingPriceJpy": 13000, "quantity": 3, "tradeType": "sell", "station": "新宿駅", "note": "..." }
```

- `condition` thẻ lẻ ∈ `PSA10|PSA9|BGS95|RAW_NM|RAW_LP|RAW_MP|RAW_HP|DAMAGED`; BOX ∈ `BOX_SHRINK|BOX_NO_SHRINK` — **phải khớp `category` của card**, lệch → `400 CONDITION_MISMATCH`.
- `quantity`: số nguyên 1–99, mặc định 1 — số lượng cùng loại người bán có. **Hiện chỉ là thông tin** (thương lượng trong chat); luồng trade vẫn đóng listing khi 1 giao dịch chốt, chưa trừ tồn từng đơn.
- `tradeType` ∈ `sell|trade`; `askingPriceJpy`, `note`, `station` (≤50 ký tự, P6.1) optional.
- `askingPriceJpy` chỉ để thương lượng — **không bao giờ vào dữ liệu giá thị trường**.

→ `201 {listing}`. Lỗi: `400 VALIDATION`, `400 CONDITION_MISMATCH`, `404 CARD_NOT_FOUND`.

### GET /api/listings/:id → `{listing}` (kèm card + seller) — `404`

### PATCH /api/listings/:id (chủ listing)

`{"status": "cancelled"}` → `{listing}`. Lỗi: `403 FORBIDDEN` (không phải chủ), `409 IN_TRADE` (đang có trade), `409 INVALID_STATUS`.

Trạng thái listing: `active | in_trade | closed | cancelled` — chuyển tự động theo trade (xem [trades.md](trades.md)).

## Comments — bình luận công khai (P3)

### GET /api/listings/:id/comments (public)

```json
{ "comments": [{ "id": "...", "userId": "...", "userDisplayName": "Taro",
  "body": "状態は？", "createdAt": "..." }] }
```

### POST /api/listings/:id/comments (cần đăng nhập + verified)

`{"body": "..."}` — 1–500 ký tự → `201 {comment}`. Lỗi: `400`, `404`.

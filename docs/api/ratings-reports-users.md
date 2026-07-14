# API — Ratings, Reports, Users (P2)

Quy ước chung: [README.md](README.md). Bất biến: rating blind-mutual — [business-rules.md](../business-rules.md) mục 11.

## Ratings — blind-mutual

Chỉ rate được trade đã chốt (`confirmed`/`self_reported`), mỗi bên đúng 1 lần. Rating của đối phương **chỉ hiện khi cả 2 đã rate** (chống trả đũa). KHÔNG liên quan việc lưu giá.

### POST /api/trades/:id/rating (cần verified)

```json
{ "score": 5, "comment": "スムーズな取引でした" }
```

`score` 1–5, `comment` optional ≤300 ký tự → `201 {rating}`.
Lỗi: `403` (không phải thành viên), `409 TRADE_NOT_CLOSED`, `409 ALREADY_RATED`, `400`.

### GET /api/trades/:id/rating

```json
{ "myRating": { "score": 5, "comment": "...", ... } | null,
  "counterpartRating": null,   // chỉ khác null khi revealed=true
  "revealed": false }
```

Lỗi: `403`, `404`.

## Users

### GET /api/users/:id/summary (public)

```json
{ "user": { "id": "...", "displayName": "Taro", "ratingAvg": 5.0, "ratingCount": 1,
  "contributionCount": 26, "memberSince": "2026-07-11T..." } }
```

`ratingAvg` chỉ tính từ rating đã reveal; null nếu chưa có. Dùng cho badge ★ trên listing detail, マイページ, danh sách purchase request.

## Reports — 通報

### POST /api/reports (cần verified)

```json
{ "reportedUserId": "...", "listingId": "...", "reason": "取引後に連絡が取れません。" }
```

`reason` 10–500 ký tự, `listingId` optional → `201 {ok: true}`.
Lỗi: `409 SELF_REPORT` (không tự report mình), `404`, `400`.
MVP chỉ lưu vào bảng `reports` — chưa có admin dashboard.

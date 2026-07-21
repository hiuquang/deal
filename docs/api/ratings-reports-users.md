# API — Ratings, Reports, Users (P2)

Quy ước chung: [README.md](README.md). Bất biến: rating blind-mutual — [business-rules.md](../business-rules.md) mục 11.

## Ratings — blind-mutual

Chỉ rate được trade đã chốt (`confirmed`/`self_reported`), mỗi bên đúng 1 lần. Rating của đối phương **chỉ hiện khi cả 2 đã rate** (chống trả đũa). KHÔNG liên quan việc lưu giá.

**Đánh giá bắt buộc (v0.16.0)**: sau khi chốt giá, đánh giá là bước **bắt buộc** trong chat — `RatingSection` hiện banner 必須 nổi bật, không có nút bỏ qua (nhắc dai trong chat, KHÔNG chặn phần còn lại của web — không ép được 1 cú click nên đây là cơ chế UI). Rating **thứ 2** của trade còn kích hoạt tự xóa chat sau 1 ngày (`setMessagesPurgeAt` → sweep, xem [chat.md](chat.md)).

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

### GET /api/users/:id/profile (public, P10)

Hồ sơ đầy đủ cho trang `/users/:id` — mọi chỉ số **derived tại thời điểm xem**
(không lưu cột, không farm được). `/summary` vẫn là bản nhẹ cho danh sách.

```json
{ "profile": {
  "id": "...", "displayName": "Taro", "memberSince": "...",
  "ratingAvg": 4.9, "ratingCount": 12,
  "xp": 730, "level": 8, "tier": "bronze", "xpIntoLevel": 30, "xpPerLevel": 100,
  "trustScore": 78,
  "badges": ["trades10", "noReport"],
  "stats": { "closedTrades": 21, "distinctPartners": 9,
             "cancelledTrades": 1, "completionRate": 0.95 },
  "safety": { "level": "green", "verifiedCount": 0,
              "pendingReporters": 0, "lastVerifiedAt": null },
  "recentReviews": [ { "score": 5, "comment": "...", "raterDisplayName": "Hanako", "createdAt": "..." } ],
  "activeListings": [ /* ListingDto */ ]
} }
```

Ngữ nghĩa (công thức chi tiết: `src/server/services/profile-service.ts`):

- **XP** = 30/trade chốt + 10/rating 5★ đã reveal + 100/mỗi 30 ngày "sạch" (không vi phạm xác minh). KHÔNG cộng XP cho đăng nhập/đăng tin (lệch spec có chủ đích — nguồn XP phải là việc thật trên chợ, thứ không giả được). Level = 1 + xp/100; tier: Bronze 1–10 / Silver 11–25 / Gold 26–50 / Platinum 51–80 / Master 81–100 / Legendary 100+.
- **trustScore 0–100** — chỉ số uy tín CHÍNH. Người mới = 50. Cộng: volume, **distinct partners** (chống bơm bằng trade lặp 1 đồng bọn), tuổi tài khoản, ★ (±20). Trừ: tỷ lệ hoàn thành <90%, **-25/report đã xác minh**. Report pending KHÔNG trừ điểm.
- **badges**: `trades10|trades100|trades500` (lấy mốc cao nhất), `topSeller` (≥50 trade bán), `trustedTrader` (trust ≥80), `perfectRating` (5.0 và ≥10 đánh giá), `noReport` (sạch + ≥5 trade + ≥30 ngày), `oneYear`.
- **safety.level**: `red` = có vi phạm ĐÃ xác minh (hiện số lần + ngày gần nhất); `yellow` = **≥2 người khác nhau** đang có report pending (1 report lẻ không đổi hiển thị công khai — chống report bẩn); `green` = còn lại. UI hiện cảnh báo tương ứng trên hồ sơ và trong panel chốt trade.

Lỗi: `404 NOT_FOUND`.

## Reports — 通報

### POST /api/reports (cần verified)

```json
{ "reportedUserId": "...", "listingId": "...", "reason": "取引後に連絡が取れません。" }
```

`reason` 10–500 ký tự, `listingId` optional → `201 {ok: true}`.
Lỗi: `409 SELF_REPORT` (không tự report mình), `404`, `400`.
Report mới có `status = pending` — chưa có admin dashboard, duyệt (`verified`/`dismissed` + `resolved_at`) tạm bằng tay ở DB. Chỉ report `verified` mới hiện công khai trên hồ sơ (xem `/profile` ở trên).

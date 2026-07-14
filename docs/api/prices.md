# API — Prices (give-to-get gate)

Quy ước chung: [README.md](README.md). Bất biến: [business-rules.md](../business-rules.md) mục 1–7.

### GET /api/prices/:cardId?condition=PSA10 (cần đăng nhập)

```json
// 200 — KHÔNG BAO GIỜ chứa thông tin user (ẩn danh từ schema)
{ "card": {...},
  "records": [ { "priceJpy": 12345, "condition": "RAW_NM", "reliability": "confirmed",
                 "flagged": false, "tradedAt": "2026-07-11T..." } ],
  "stats": { "count": 5, "median": 12800, "min": 11000, "max": 15700 } }
```

```json
// 403 NEED_CONTRIBUTION — user chưa đóng góp giao dịch nào (give-to-get)
{ "error": { "code": "NEED_CONTRIBUTION", "message": "相場データを見るには...",
  "details": { "recordCount": 7 } } }
```

- `reliability`: `confirmed` (2 bên xác nhận) | `self_reported` (tự chốt sau 7 ngày).
- `flagged: true` (P2) = giá lệch >50% so với median của ≥3 record chưa-flag cùng (card, condition) tại thời điểm tạo — vẫn trả về nhưng **loại khỏi `stats`** (UI loại khỏi chart, hiện ⚠ 外れ値の可能性).
- `details.recordCount` trong lỗi 403 = teaser tạo động lực đóng góp.
- Endpoint này cũng lazy-check auto-close trade quá hạn.
- Dữ liệu giá BOX dùng chung pipeline này.

# API — Prices (give-to-get gate)

Quy ước chung: [README.md](README.md). Bất biến: [business-rules.md](../business-rules.md) mục 1–7.

### GET /api/prices/:cardId?condition=PSA10 (CÔNG KHAI — không cần đăng nhập)

```json
// 200 — KHÔNG BAO GIỜ chứa thông tin user (ẩn danh từ schema)
{ "card": {...},
  "records": [ { "priceJpy": 12345, "condition": "RAW_NM", "reliability": "confirmed",
                 "flagged": false, "tradedAt": "2026-07-11T..." } ],
  "stats": { "count": 5, "median": 12800, "min": 11000, "max": 15700 },
  "locked": false, "recordCount": 5 }
```

**Gate give-to-get nằm trong response, KHÔNG còn ném 403** (đổi ở v0.28.0 — trước đó chưa đóng góp = `403 NEED_CONTRIBUTION`, khách chưa đăng nhập = `401`). Ba trạng thái, quyết định bởi hàm thuần `priceAccess(recordCount, contributionCount)`:

| Trạng thái | Điều kiện | `records` | `stats` | `locked` |
|---|---|---|---|---|
| empty | `recordCount === 0` | `[]` | rỗng | `false` |
| teaser | có dữ liệu, người xem chưa đóng góp (kể cả khách) | `[]` | **đầy đủ** | `true` |
| full | đã đóng góp ≥1 giao dịch | đầy đủ | đầy đủ | `false` |

- **Thẻ chưa có giao dịch nào thì KHÔNG khóa** — khóa một cái hộp rỗng vừa vô nghĩa vừa đuổi khách mới (họ nhận đúng hai thông điệp "chẳng có gì" + "mà bạn cũng không được xem").
- **Teaser trả `stats` nhưng giấu `records`**: đủ chứng minh dữ liệu có thật, vẫn giữ động lực đóng góp. Lý do nới: ở mốc gần 0 giao dịch, cổng cũ chặn đúng cái phễu nó sinh ra để nuôi.
- `recordCount` đếm **mọi condition**; `stats` thì theo bộ lọc `condition` — hai con số này cố ý không khớp nhau.
- `reliability`: `confirmed` (2 bên xác nhận) | `self_reported` (tự chốt sau 7 ngày).
- `flagged: true` (P2) = giá lệch >50% so với median của ≥3 record chưa-flag cùng (card, condition) tại thời điểm tạo — vẫn trả về nhưng **loại khỏi `stats`** (UI loại khỏi chart, hiện ⚠ 外れ値の可能性).
- Endpoint này cũng lazy-check auto-close trade quá hạn.
- Dữ liệu giá BOX dùng chung pipeline này.

### POST /api/kaitori/scan · POST /api/kaitori/import (CHỈ CHỦ WEB)

Thu thập giá 買取 từ X qua Grok. Chi tiết + lý do thiết kế: [kaitori.md](../kaitori.md).

- Gate `requireOwner()` (env `OWNER_USER_ID`). Không phải chủ web → **404**, không phải 403: người lạ dò trúng URL không có lý do gì để biết ở đây CÓ trang họ không vào được. Thiếu env → chặn hết.
- `scan` **KHÔNG ghi gì vào DB**, chỉ trả đề xuất chờ duyệt. `import` là cửa DUY NHẤT đưa 買取 vào `reference_prices`, và chỉ nhận dòng đã có `cardId` do người chọn.
- ⚠️ `scan` gọi API xAI **tốn tiền thật** → chỉ POST, không bao giờ để GET.

### GET /api/reference-prices/:cardId (CÔNG KHAI — không auth, không gate)

```json
// 200 — giá THAM KHẢO từ nguồn NGOÀI platform (KHÔNG phải giao dịch trên DEAL)
{ "card": {...},
  "groups": [
    { "kind": "kaitori",
      "records": [ { "source": "yuyu_tei", "kind": "kaitori", "quantity": 1, "priceJpy": 11000,
                     "note": null, "sourceUrl": "https://x.com/…", "recordedAt": "…" } ],
      "stats": { "count": 1, "median": 11000, "min": 11000, "max": 11000,
                 "weightedAvg": 11000, "totalQuantity": 1 } },
    { "kind": "rao", "records": [ … ], "stats": { … } }
  ] }
```

⚠️ **ĐỔI SHAPE ở v0.32.0**: trước đó trả `records` + `stats` phẳng. Giờ **gom theo `kind`, mỗi nhóm một thống kê RIÊNG**, và **không còn con số gộp chung**. Lý do: trộn 買取 (shop thu vào, thấp) với giá rao (cao) ra trung bình vô nghĩa mà nhìn vẫn như thật — lỗi tồn tại từ v0.21.0, vì nhãn `source` chỉ để hiển thị chứ không tách thống kê. Thứ tự nhóm cố định `kaitori → ban → rao` (sàn → thật → trần). Nhóm rỗng bị loại; `kind` lạ trong DB rơi về `rao` thay vì biến mất.

- **Tách hẳn khỏi `/api/prices`**: nguồn ngoài do chủ web nhập tay (bảng `reference_prices`), KHÔNG trộn vào `price_records` (giao dịch P2P thật, ẩn danh) — không được coi là dữ liệu đóng cho AI.
- KHÔNG gate give-to-get và KHÔNG cần đăng nhập: mục đích là cho người mới thấy mặt bằng giá khi web còn ít giao dịch → xây niềm tin. Cache như catalog (`PUBLIC_CATALOG_CACHE`).
- `quantity` = số lượng (pack) quan sát; `priceJpy` = đơn giá/pack. `weightedAvg` = trung bình có trọng số theo `quantity`.
- Trả kèm `card` để trang `/prices/:cardId` hiển thị được ngay cả khi phần giá-giao-dịch-thật đang bị khóa.
- Nhập/cập nhật dữ liệu (idempotent, chỉ chủ web chạy — không có admin UI, giống VIP/report):
  - **Hằng ngày**: ghi quan sát vào `prisma/reference-prices.txt` (1 dòng = 1 quan sát) → `npm run db:import-prices` xem thử → thêm `-- --apply` để ghi. **Mặc định KHÔNG ghi** vì script chạy thẳng vào DB production.
  - **Dữ liệu lịch sử pin cứng trong code**: `npm run db:seed-reference-prices` (mảng `DATA` trong `prisma/seed-reference-prices.ts`).
  - **Giá 買取 từ X**: trang `/admin/kaitori` (Grok đề xuất → chủ web duyệt) — xem [kaitori.md](../kaitori.md).
- Cột `kind` (`rao` mặc định / `ban` / `kaitori`) quyết định nhóm thống kê. Nhãn `source` chỉ để HIỂN THỊ nguồn, **không** dùng để tách số liệu.
- ⚠️ **KHÔNG đổ vào đây dữ liệu lấy tự động từ sàn khác** (SNKRDUNK/スニダン…): điều khoản của họ cấm hiển thị lại thông tin lấy từ dịch vụ và cấm dùng cho mục đích thương mại khi chưa xin phép. Đây là giá chủ web TỰ quan sát.
- UI cảnh báo khi điểm giá mới nhất đã quá 7 ngày — giá box biến động theo tuần, số cũ mà không nói gì là nói sai về thị trường.

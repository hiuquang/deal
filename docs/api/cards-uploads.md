# API — Cards (catalog) & Uploads

Quy ước chung: [README.md](README.md).

## Cards (public, không cần đăng nhập)

### GET /api/cards?q=リザードン&game=pokemon&category=single

`q` search theo name/set/số thẻ; `game`: `pokemon | onepiece | other`; `category` (P3): `single | box`. Trả tối đa 20 kết quả (phục vụ autocomplete — user **không được gõ tên thẻ tự do**, trừ mục `other` — xem POST bên dưới).

```json
{ "cards": [{ "id": "...", "game": "pokemon", "category": "single", "setCode": "sv4a",
  "cardNumber": "205/190", "language": "JP", "nameJa": "リザードンex",
  "nameEn": "Charizard ex", "rarity": "SAR" }] }
```

BOX là entry catalog với `category: "box"`, `cardNumber: "BOX"`.

### GET /api/cards/:id → `{card}` — `404 NOT_FOUND`

### POST /api/cards (cần đăng nhập + verified)

User tự thêm sản phẩm/thẻ khi catalog thiếu — **từ 0.12.1 mở cho MỌI game** (trước đó chỉ mục その他; business-rules #13 đã nới theo quyết định chủ web). **Find-or-create** theo `(game, name, category)` — gọi 2 lần cùng tên trả về cùng 1 card (race được unique constraint của `cards` chặn, server bắt P2002 và trả bản ghi thắng cuộc). `game` optional, mặc định `"other"` (tương thích client cũ).

```json
// request
{ "game": "pokemon", "name": "ピカチュウAR", "category": "single" }
// 201 (cả khi đã tồn tại — idempotent)
{ "card": { "id": "...", "game": "pokemon", "category": "single", "setCode": "CUSTOM",
  "cardNumber": "ピカチュウAR", "language": "JP", "nameJa": "ピカチュウAR",
  "nameEn": "ピカチュウAR", "rarity": "-" } }
```

Quy ước lưu (`userProductSetCode` trong `src/server/repositories/cards.ts`): mục その他 giữ `setCode = "OTHER"` / `"OTHER-BOX"`; pokemon/onepiece dùng `"CUSTOM"` / `"CUSTOM-BOX"` — tách hẳn khỏi catalog chuẩn để lọc/dọn được. `cardNumber` = tên sản phẩm (unique `(game, setCode, cardNumber, language)` dedupe ở DB). UI ẩn setCode/cardNumber/rarity với mọi entry user tự thêm (helper `cardSpec`/`isUserProduct` trong `src/lib/labels.ts`). UI chỉ hiện nút "thêm mới" khi tên gõ vào không khớp chính xác thẻ nào trong kết quả tìm — ưu tiên catalog, hạn chế entry trùng.

Lỗi: `400 VALIDATION` (tên rỗng / quá 100 ký tự / game sai), `403 EMAIL_NOT_VERIFIED`, `403 TERMS_NOT_ACCEPTED`.

## Uploads

### POST /api/uploads (cần đăng nhập + verified)

multipart/form-data, field `file` (jpeg/png/webp, ≤ 5MB). Lưu `public/uploads/`.

```json
// 201
{ "url": "/uploads/9f3c...e1.png" }
```

Lỗi: `400 VALIDATION` (sai loại file / quá 5MB).

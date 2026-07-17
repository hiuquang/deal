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

Tạo sản phẩm mục **その他** (`game: "other"`) — ngoại lệ duy nhất của quy tắc "chỉ chọn từ catalog" (business-rules #13): sản phẩm ngoài Pokémon/One Piece không có catalog nên user tự đặt tên. **Find-or-create** theo `(name, category)` — gọi 2 lần cùng tên trả về cùng 1 card (race được unique constraint của `cards` chặn, server bắt P2002 và trả bản ghi thắng cuộc).

```json
// request
{ "name": "プレイマット", "category": "single" }
// 201 (cả khi đã tồn tại — idempotent)
{ "card": { "id": "...", "game": "other", "category": "single", "setCode": "OTHER",
  "cardNumber": "プレイマット", "language": "JP", "nameJa": "プレイマット",
  "nameEn": "プレイマット", "rarity": "-" } }
```

Quy ước lưu: `setCode = "OTHER"` (single) / `"OTHER-BOX"` (box), `cardNumber` = tên sản phẩm (để unique `(game, setCode, cardNumber, language)` dedupe ở DB). UI ẩn setCode/cardNumber/rarity với card `game=other` (helper `cardSpec` trong `src/lib/labels.ts`).

Lỗi: `400 VALIDATION` (tên rỗng / quá 100 ký tự), `403 EMAIL_NOT_VERIFIED`, `403 TERMS_NOT_ACCEPTED`.

## Uploads

### POST /api/uploads (cần đăng nhập + verified)

multipart/form-data, field `file` (jpeg/png/webp, ≤ 5MB). Lưu `public/uploads/`.

```json
// 201
{ "url": "/uploads/9f3c...e1.png" }
```

Lỗi: `400 VALIDATION` (sai loại file / quá 5MB).

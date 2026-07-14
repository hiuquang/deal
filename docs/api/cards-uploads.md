# API — Cards (catalog) & Uploads

Quy ước chung: [README.md](README.md).

## Cards (public, không cần đăng nhập)

### GET /api/cards?q=リザードン&game=pokemon&category=single

`q` search theo name/set/số thẻ; `game`: `pokemon | onepiece`; `category` (P3): `single | box`. Trả tối đa 20 kết quả (phục vụ autocomplete — user **không được gõ tên thẻ tự do**).

```json
{ "cards": [{ "id": "...", "game": "pokemon", "category": "single", "setCode": "sv4a",
  "cardNumber": "205/190", "language": "JP", "nameJa": "リザードンex",
  "nameEn": "Charizard ex", "rarity": "SAR" }] }
```

BOX là entry catalog với `category: "box"`, `cardNumber: "BOX"`.

### GET /api/cards/:id → `{card}` — `404 NOT_FOUND`

## Uploads

### POST /api/uploads (cần đăng nhập + verified)

multipart/form-data, field `file` (jpeg/png/webp, ≤ 5MB). Lưu `public/uploads/`.

```json
// 201
{ "url": "/uploads/9f3c...e1.png" }
```

Lỗi: `400 VALIDATION` (sai loại file / quá 5MB).

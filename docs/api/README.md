# API contract — quy ước chung

> `docs/api/` là **contract chuẩn** — nguồn phân xử khi code và tài liệu mâu thuẫn. Sửa API = cập nhật file domain tương ứng trong cùng commit.

Base URL: `http://localhost:3000`. Auth qua session cookie `deal_session` (httpOnly), tự set khi register/login.

**Format lỗi thống nhất** cho mọi endpoint:

```json
{ "error": { "code": "PRICE_MISMATCH", "message": "相手が入力した金額と一致しません。", "details": null } }
```

- Endpoint cần đăng nhập mà thiếu session → `401 UNAUTHORIZED`.
- Hành động ghi khi email chưa xác nhận → `403 EMAIL_NOT_VERIFIED`; khi chưa đồng ý điều khoản bản hiện hành → `403 TERMS_NOT_ACCEPTED` (xem [business-rules.md](../business-rules.md) mục gate).
- Validation fail → `400 VALIDATION`.
- Vượt rate limit → `429 RATE_LIMITED` (chỉ nhóm `/api/auth/*` — ngưỡng cụ thể ở [auth.md](auth.md)).

## Map endpoint → file

| Domain | File | Endpoints |
|---|---|---|
| Auth, verify email, quên mật khẩu, terms | [auth.md](auth.md) | `/api/auth/*`, `/api/dev/mailbox` |
| Catalog thẻ + upload ảnh | [cards-uploads.md](cards-uploads.md) | `/api/cards*`, `/api/uploads` |
| Listing + bình luận công khai | [listings.md](listings.md) | `/api/listings*`, `/api/listings/:id/comments` |
| Luồng mua 購入希望 → 連携 | [purchase-requests.md](purchase-requests.md) | `/api/listings/:id/requests*`, `/api/requests/:id/connect` |
| Tin gom số lượng lớn (まとめ買い) | [buy-orders.md](buy-orders.md) | `/api/buy-orders*`, `/api/buy-orders/offers/:id/connect` |
| Chat | [chat.md](chat.md) | `/api/conversations*` |
| Trade (trái tim của app) | [trades.md](trades.md) | `/api/trades*` (trừ rating) |
| Rating, report, hồ sơ user | [ratings-reports-users.md](ratings-reports-users.md) | `/api/trades/:id/rating`, `/api/reports`, `/api/users/:id/summary` |
| Dữ liệu giá (give-to-get gate) | [prices.md](prices.md) | `/api/prices/:cardId` |

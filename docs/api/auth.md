# API — Auth

Quy ước chung (format lỗi, cookie): [README.md](README.md).

## POST /api/auth/register

```json
// Request — agreeTerms bắt buộc = true (đồng ý 利用規約, P5)
{ "email": "taro@example.com", "password": "password123", "displayName": "Taro", "agreeTerms": true }
// 200 + Set-Cookie deal_session
{ "user": { "id": "cm...", "email": "taro@example.com", "displayName": "Taro" } }
```

Lỗi: `400 VALIDATION` (password < 8 ký tự, thiếu agreeTerms...), `409 EMAIL_TAKEN`. Đăng ký xong tự gửi mail verify (xem dưới).

## POST /api/auth/login

`{email, password}` → `200 {user}` + cookie. Lỗi: `401 INVALID_CREDENTIALS`.

## POST /api/auth/logout → `{ok: true}`

## GET /api/auth/me

```json
{ "user": { "id": "...", "email": "...", "displayName": "...", "contributionCount": 3,
  "canViewPrices": true, "emailVerified": true, "termsAccepted": true } }
```

`termsAccepted: false` khi version user đã đồng ý ≠ `TERMS_VERSION` hiện hành → UI hiện modal TermsGate, server chặn mọi hành động ghi bằng `403 TERMS_NOT_ACCEPTED`.

## POST /api/auth/accept-terms (P5)

Đồng ý bản 利用規約 hiện hành, idempotent → `{ok:true}`. Trang chính sách public: `/terms`, `/privacy`.

## Xác nhận email & quên mật khẩu (P4)

Đăng ký xong nhận mail chứa link `/verify?token=...` (hạn 24h, dùng 1 lần). **Chưa xác nhận → mọi hành động ghi trả `403 EMAIL_NOT_VERIFIED`**. Chưa cấu hình SMTP → mail vào `/dev/mailbox` (xem [email.md](../email.md)).

| Method | Path | Request | Response | Lỗi |
|---|---|---|---|---|
| POST | `/api/auth/verify` | `{token}` | `{ok:true}` | 400 `INVALID_TOKEN` (sai/hết hạn/đã dùng) |
| POST | `/api/auth/resend-verification` | — (cần đăng nhập) | `{ok:true}` | 409 `ALREADY_VERIFIED` |
| POST | `/api/auth/forgot` | `{email}` | `{ok:true}` — **LUÔN LUÔN** (không lộ email tồn tại) | 400 |
| POST | `/api/auth/reset` | `{token, password ≥8 ký tự}` | `{ok:true}` — đổi mật khẩu + **đăng xuất mọi thiết bị** | 400 `INVALID_TOKEN` |
| GET | `/api/dev/mailbox` | — | `{emails:[...]}` — DEV ONLY (404 ở production/khi có SMTP) | — |

Luồng reset: `/forgot-password` nhập email → mail link `/reset-password?token=...` (hạn 1h) → nhập mật khẩu mới → xóa toàn bộ session cũ.

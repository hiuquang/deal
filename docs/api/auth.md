# API — Auth

Quy ước chung (format lỗi, cookie): [README.md](README.md).

## Rate limit (429 RATE_LIMITED)

Chỉ nhóm `/api/auth/*` bị chặn. Cửa sổ cố định, bộ đếm nằm ở bảng `rate_limits`
(Postgres) — **không phải RAM**: Vercel serverless nhiều instance + cold start
nên đếm trong RAM là vô nghĩa. Ngưỡng khai báo ở `LIMITS`
(`src/server/services/rate-limit-service.ts`), sửa số ở đó là đủ.

| Endpoint | Chặn theo | Ngưỡng |
|---|---|---|
| `/api/auth/login` | IP | 20 / 10 phút |
| `/api/auth/login` | email | 8 / 10 phút |
| `/api/auth/register` | IP | 5 / giờ |
| `/api/auth/forgot` | IP | 6 / giờ |
| `/api/auth/forgot` | email | **3 / giờ** |
| `/api/auth/reset` | IP | 10 / giờ |
| `/api/auth/resend-verification` | user id | 3 / giờ |

Vì sao thế:

- **Login chặn 2 chiều** — theo IP cản 1 máy dò nhiều tài khoản, theo email cản
  nhiều IP cùng dò 1 tài khoản (đổi IP KHÔNG lách được). Bộ đếm chạy trước khi
  so mật khẩu; đăng nhập thành công thì xóa bộ đếm để người thật gõ sai vài lần
  không bị phạt tiếp.
- **Nhóm gửi mail siết nhất** — mỗi request là 1 mail thật qua Gmail SMTP: tốn
  quota và có nguy cơ bị Google khóa App Password nếu bị lợi dụng spam.
- **`forgot` vẫn không lộ email nào tồn tại** — bộ đếm chạy trước và độc lập với
  việc email có trong DB hay không, nên 429 đến cùng thời điểm với email không
  tồn tại. Đánh đổi đã biết: kẻ xấu có thể đốt 3 lượt/giờ của nạn nhân.
- **FAIL-OPEN** — bộ đếm lỗi (pooler Supabase nguội) thì cho request đi tiếp,
  không khóa cả app. Không mất an ninh: mọi hành động ở đây đều cần DB mới làm
  được việc, DB chết thì kẻ tấn công cũng không dò được gì.

## POST /api/auth/register

```json
// Request — agreeTerms bắt buộc = true (đồng ý 利用規約, P5)
{ "email": "taro@example.com", "password": "password123", "displayName": "Taro", "agreeTerms": true }
// 200 + Set-Cookie deal_session
{ "user": { "id": "cm...", "email": "taro@example.com", "displayName": "Taro" } }
```

Lỗi: `400 VALIDATION` (password < 8 ký tự, thiếu agreeTerms...), `409 EMAIL_TAKEN`, `429 RATE_LIMITED`. Đăng ký xong tự gửi mail verify (xem dưới).

## POST /api/auth/login

`{email, password}` → `200 {user}` + cookie. Lỗi: `401 INVALID_CREDENTIALS`, `429 RATE_LIMITED`.

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
| POST | `/api/auth/verify` | `{token}` | `{ok:true}` | 400 `INVALID_TOKEN` (sai/hết hạn — riêng token đã dùng: nếu user của token ĐÃ verified thì vẫn trả `{ok:true}`, idempotent để link bấm lần 2 / mail scanner prefetch không báo lỗi ảo) |
| POST | `/api/auth/resend-verification` | — (cần đăng nhập) | `{ok:true}` | 409 `ALREADY_VERIFIED`, 429 |
| POST | `/api/auth/forgot` | `{email}` | `{ok:true}` — **LUÔN LUÔN** (không lộ email tồn tại) | 400, 429 |
| POST | `/api/auth/reset` | `{token, password ≥8 ký tự}` | `{ok:true}` — đổi mật khẩu + **đăng xuất mọi thiết bị** | 400 `INVALID_TOKEN`, 429 |
| GET | `/api/dev/mailbox` | — | `{emails:[...]}` — DEV ONLY (404 ở production/khi có SMTP) | — |

Luồng reset: `/forgot-password` nhập email → mail link `/reset-password?token=...` (hạn 1h) → nhập mật khẩu mới → xóa toàn bộ session cũ.

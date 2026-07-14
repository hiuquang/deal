# Hạ tầng email (P4)

## Cơ chế (`src/server/mailer.ts`)

- Có đủ `SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS` trong env → gửi thật qua **nodemailer**.
- Thiếu → **dev mode**: mail lưu vào bảng `email_outbox`, xem tại `/dev/mailbox` (chỉ tồn tại khi `NODE_ENV !== production`; tự vô hiệu khi có SMTP).

## Trạng thái hiện tại

- SMTP thật đã cấu hình trong `.env` local (Gmail App Password) → mail verify/reset gửi vào hộp thư thật, `/dev/mailbox` tự tắt.
- ⚠️ **KHÔNG đọc/ghi `SMTP_PASS`** trong `.env`; `.env` đã gitignore, không bao giờ commit.
- Đổi tài khoản gửi: bật 2FA cho Gmail đó → tạo App Password tại myaccount.google.com/apppasswords → thay `SMTP_USER`/`SMTP_PASS`. App Password chỉ dùng được với đúng tài khoản tạo ra nó.

## Token (bảng `email_tokens`)

| Type | Hạn | Ghi chú |
|---|---|---|
| `verify` | 24h | Link `/verify?token=...`, dùng 1 lần; có nút gửi lại |
| `reset` | 1h | Link `/reset-password?token=...`; reset xong xóa toàn bộ session |

Seed users được set verified sẵn — demo không bị chặn.

## Biến env

| Biến | Mặc định | Ghi chú |
|---|---|---|
| `APP_URL` | `http://localhost:3000` | URL gốc trong link email |
| `SMTP_HOST/PORT/USER/PASS/FROM` | (trống) | Trống → dev mailbox. Gmail: `smtp.gmail.com` / `465` |

Xem `.env.example`. Endpoints liên quan: [api/auth.md](api/auth.md).

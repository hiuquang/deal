# Hạ tầng email (P4, chuỗi dự phòng từ 0.11.1; đảo SMTP lên trước từ 0.11.2)

## Cơ chế (`src/server/mailer.ts`)

Gửi mail theo **chuỗi dự phòng**, đọc env tại thời điểm gọi:

1. Có `SMTP_HOST/USER/PASS` → **Gmail SMTP** qua nodemailer trước. Gmail giới
   hạn ~500 người nhận/ngày — vượt là Google chặn gửi 24–72h — nhưng là đường
   DUY NHẤT chắc chắn tới hộp thư chừng nào sender còn là địa chỉ `@gmail.com`.
2. SMTP lỗi (hoặc chưa cấu hình) → **Brevo HTTP API** (`BREVO_API_KEY` +
   `BREVO_FROM`, free 300 mail/ngày). Timeout 10s để serverless không treo.
3. Cả hai chưa cấu hình → **dev mode**: mail lưu vào bảng `email_outbox`, xem
   tại `/dev/mailbox` (chỉ khi `NODE_ENV !== production`; tự vô hiệu khi có
   bất kỳ đường gửi thật nào — check `isMailConfigured()`).

SMTP lỗi mà không có Brevo dự phòng → `sendMail` ném lỗi cho caller (đúng hành
vi cũ của SMTP-only).

⚠️ **Vì sao Brevo KHÔNG được làm đường chính** (bài học production 2026-07-18):
gửi từ sender freemail (`@gmail.com`) qua server Brevo → Brevo nhận mail (API
trả 2xx, log `[mail][brevo] sent`) nhưng Gmail **từ chối thẳng ở cửa SMTP** vì
mail đứng tên gmail.com mà không có DKIM của Google — mail không vào nổi cả
thư mục spam, thành **hố đen im lặng**: code thấy "thành công" nên không bao
giờ fallback. Chỉ đưa Brevo lên làm đường chính sau khi có **domain riêng đã
authenticate (SPF/DKIM)** trên Brevo.

## Cấu hình Brevo (đường dự phòng)

1. Tạo tài khoản free tại https://app.brevo.com (300 mail/ngày, không cần thẻ).
2. **Verify sender**: Settings → Senders, Domains & Dedicated IPs → Add sender
   → nhập địa chỉ sẽ đứng tên gửi (nhận mail xác nhận → bấm link). Chưa có
   domain riêng thì verify chính địa chỉ Gmail đang dùng — gửi được nhưng dễ
   vào spam hơn; có domain riêng + SPF/DKIM là nâng cấp đáng làm sau.
3. Lấy API key: Settings → SMTP & API → **API Keys** (dạng `xkeysib-...`) —
   KHÔNG phải SMTP key.
4. Set `BREVO_API_KEY` + `BREVO_FROM` (đúng địa chỉ đã verify) vào `.env` local
   và env trên Vercel → redeploy.

## Trạng thái hiện tại

- Production (Vercel): đủ cả `SMTP_*` lẫn `BREVO_*` → SMTP chính, Brevo lui.
- `.env` local hiện KHÔNG có SMTP/Brevo → dev dùng outbox `/dev/mailbox`.
- ⚠️ **KHÔNG đọc/ghi `SMTP_PASS`/`BREVO_API_KEY`** trong `.env`; `.env` đã
  gitignore, không bao giờ commit.
- Đổi tài khoản Gmail gửi: bật 2FA → tạo App Password tại
  myaccount.google.com/apppasswords → thay `SMTP_USER`/`SMTP_PASS`.

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
| `BREVO_API_KEY` | (trống) | API key `xkeysib-...` — có cả cặp này mới bật đường Brevo |
| `BREVO_FROM` | (trống) | Địa chỉ sender ĐÃ verify trên Brevo |
| `SMTP_HOST/PORT/USER/PASS/FROM` | (trống) | Gmail: `smtp.gmail.com` / `465` |

Xem `.env.example`. Endpoints liên quan: [api/auth.md](api/auth.md).
Test chuỗi fallback: `tests/mailer.test.ts`.

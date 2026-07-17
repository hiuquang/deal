# Deploy production — Vercel + Supabase

Kiến trúc production: **Vercel** (Next.js serverless) + **Supabase** (Postgres
+ Storage cho ảnh upload). Lý do bắt buộc: Vercel không có đĩa ghi lâu dài nên
SQLite (`file:./dev.db`) và ảnh lưu `public/uploads` chỉ dùng được ở dev.

**Trạng thái: đã cutover sang Postgres (2026-07-17).** `prisma/schema.prisma`
dùng provider `postgresql`, DB dev/local trỏ thẳng Supabase project `deal`
(region ap-southeast-2). Migrations SQLite cũ lưu tham khảo ở
`prisma/_archive-sqlite-migrations/` (không dùng nữa).

## Những gì đã chuẩn bị sẵn trong repo

| Thứ | Ở đâu |
|---|---|
| Migration Postgres init (16 bảng + 2 partial unique index chống race) | `prisma/migrations/20260717000000_init/` |
| Seed production (chỉ catalog thẻ, không dữ liệu mẫu) | `npm run db:seed-prod` |
| Upload ảnh tự chuyển Supabase Storage khi có env | `src/app/api/uploads/route.ts` — cần bucket **public** tên `uploads` |
| `prisma generate` khi build trên Vercel | script `postinstall` trong package.json |
| Xóa sạch dữ liệu giao dịch (giữ users + catalog) | `npm run db:reset-test` |
| Region serverless function = `syd1` (sát DB Sydney) | `vercel.json` — mặc định Vercel là US, mỗi request tốn nhiều vòng US↔Sydney; đổi region DB thì sửa cả đây |

Từ giờ **KHÔNG chạy `prisma migrate dev`** nữa (Supabase pooler không tạo được
shadow database) — đổi schema thì `npx prisma migrate diff` sinh SQL rồi
`npx prisma migrate deploy`.

Auto-close trade là **lazy** (gọi khi đọc trades/prices, không cần cron) — chạy
được trên serverless, không phải cấu hình gì thêm.

## Biến môi trường trên Vercel

| Biến | Giá trị |
|---|---|
| `DATABASE_URL` | Supabase **Transaction pooler** (port 6543) + `?pgbouncer=true` |
| `DIRECT_URL` | Supabase kết nối trực tiếp (port 5432) — chỉ migrate dùng |
| `APP_URL` | URL production (vd `https://deal-xxx.vercel.app`) — link trong email |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (secret — không lộ ra client) |
| `SMTP_HOST/PORT/USER/PASS/FROM` | Như `.env` local (Gmail App Password) |

## Quy trình deploy lần đầu

1. ~~Tạo project Supabase, cutover Prisma sang Postgres~~ — **đã xong** (2026-07-17).
2. Tạo Storage bucket `uploads` trên Supabase, chọn **Public**.
3. `npx prisma migrate deploy && npm run db:seed-prod`, test local chạy trên
   Supabase, commit + push.
4. Vercel: Import repo GitHub `hiuquang/deal` → thêm env ở bảng trên → Deploy.
5. Smoke test trên URL thật: đăng ký (email verify thật) → đăng tin (ảnh lên
   Supabase Storage) → chat → chốt trade → giá xuất hiện.

Deploy các lần sau: chỉ cần push lên `main` — Vercel tự build. Có migration
mới thì chạy `npx prisma migrate deploy` từ local (DIRECT_URL) trước khi push.

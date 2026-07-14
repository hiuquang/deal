# Kiến trúc & tech stack

## Tech stack

| Tầng | Lựa chọn | Lý do |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | Full-stack 1 repo, 1 người làm nhanh nhất, phổ biến ở Nhật (tốt cho portfolio) |
| Backend | Next.js Route Handlers, kiến trúc `routes → services → repositories` | Không cần server riêng, vẫn tách được business logic để unit test |
| Database | **SQLite (dev) qua Prisma ORM** | Zero-setup trên Windows; đổi sang Postgres/Supabase khi deploy chỉ cần đổi connection string |
| Auth | Session cookie (`deal_session`, httpOnly, 30 ngày) + email/password (bcrypt) | LINE Login + SMS OTP cần tài khoản ngoài → để V-next |
| Chat realtime | **Polling 3–5s**, incremental qua `?after=` | Đơn giản nhất chạy được; WebSocket/Pusher để sau |
| UI | Tailwind CSS 4, tiếng Nhật chính + i18n ja/vi/en | Xem [i18n.md](i18n.md) |
| Mail | nodemailer; SMTP thật hoặc dev mailbox | Xem [email.md](email.md) |
| Test | Vitest (unit tầng service) + bộ E2E qua API thật | 48+ unit test, 4 bộ E2E |
| Deploy (sau) | Vercel + Supabase Postgres | Free tier đủ MVP |

## Phân tầng (bắt buộc tuân thủ)

```
Trình duyệt (Next.js pages)
   │  fetch qua src/lib/api-client.ts (UI KHÔNG fetch trực tiếp)
   ▼
Route Handlers   src/app/api/**             ← CHỈ validate (zod) + gọi service
   ▼
Services         src/server/services/**     ← business logic thuần, unit test tại tests/
   ▼
Repositories     src/server/repositories/** ← MỌI truy cập Prisma nằm ở đây
   ▼
Prisma → SQLite (dev.db)
```

File hạ tầng dùng chung trong `src/server/`: `session.ts` (session cookie), `validation.ts` (zod schemas + enum values), `errors.ts` (ApiError + format lỗi thống nhất), `mailer.ts` (gửi mail).

## Cấu trúc thư mục

```
deal/
├── CLAUDE.md              ← bản đồ dự án (đọc trước)
├── docs/                  ← tài liệu chia theo chủ đề; docs/api/ = contract chuẩn
├── prisma/
│   ├── schema.prisma      ← schema (xem data-model.md)
│   └── seed.ts            ← seed users/cards/listings/prices (idempotent)
├── public/uploads/        ← ảnh listing (local; cloud storage để V-next)
├── src/
│   ├── app/               ← pages (App Router) + api/ route handlers
│   ├── server/            ← services / repositories / hạ tầng
│   ├── components/        ← React components (client)
│   └── lib/               ← api-client.ts, types.ts (DTO chung FE/BE),
│                            i18n.tsx, messages.ts, terms.ts
└── tests/                 ← vitest
```

## Ghi chú thiết kế

- **Auto-close trade 7 ngày** dùng **lazy evaluation** (kiểm tra khi có request đọc trade/price), không cron — đủ cho MVP.
- Route frontend: `/` (browse + filter), `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify`, `/listings/new`, `/listings/[id]`, `/chat`, `/prices/[cardId]`, `/me`, `/terms`, `/privacy`, `/dev/mailbox` (dev only).

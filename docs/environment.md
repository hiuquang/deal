# Môi trường dev & troubleshooting

## Cài đặt & chạy

Yêu cầu: Node.js 20+.

```bash
cd deal
npm install
npx prisma generate      # generate client (KHÔNG dùng migrate dev nữa — xem dưới)
npm run dev              # → http://localhost:3000
```

Từ cutover 2026-07-17, **dev nối thẳng Supabase Postgres dùng chung với production** (`DATABASE_URL` trong `.env`) — không còn SQLite; `prisma/dev.db` là tàn dư. Hệ quả:

- **KHÔNG chạy `prisma migrate dev`** — Supabase pooler không tạo được shadow DB. Đổi schema: `prisma migrate diff` sinh SQL → `prisma migrate deploy` (chi tiết: [deploy.md](deploy.md)).
- Mọi thao tác ghi ở local (đăng ký, đăng tin, seed) **đụng vào DB thật**.
- Pooler "nguội" có thể gây `Can't reach database server` ở request đầu sau khi start dev server — thử lại là hết, không phải lỗi config.

Dev server dùng **Turbopack** (`next dev --turbopack`, từ 2026-07-16) — compile nhanh hơn Webpack nhiều lần, hết khựng theo đợt khi vào route mới. Dev server chạy lâu ngày (>1 ngày) vẫn có thể suy thoái tích tụ → chậm bất thường (API 8–15s) thì cứ restart.

⚠️ **Tài khoản demo (`demo@example.com` / `password123` + taro/hanako/kenji/yuki) KHÔNG còn trong DB** — đã xóa khi mở test production (2026-07-17), login trả 401. Cần trạng thái đã đăng nhập: tự đăng ký, hoặc `npm run db:seed` để tái tạo demo + dữ liệu mẫu — nhưng seed ghi vào DB production, **hỏi trước khi chạy**.

Lệnh khác:

```bash
npm test        # unit tests (vitest)
npm run build   # production build + typecheck — KHÔNG chạy khi dev server đang bật
npm run db:seed # chạy lại seed (idempotent)
```

## Biến môi trường

| Biến | Mặc định | Ghi chú |
|---|---|---|
| `DATABASE_URL` | (bắt buộc) | Supabase Postgres qua pooler — cả dev lẫn production; xem [deploy.md](deploy.md) |
| `DIRECT_URL` | (bắt buộc khi migrate) | Kết nối trực tiếp (không qua pooler) cho `prisma migrate deploy` |
| `APP_URL` | `http://localhost:3000` | URL gốc: link trong email **và** `metadataBase` cho thẻ OG + `sitemap.xml` (`src/lib/site.ts`). ⚠️ Sai giá trị này trên production = mọi link chia sẻ ra Facebook/Zalo mất ảnh preview |
| `SMTP_*` | (trống) | Xem [email.md](email.md) — ⚠️ KHÔNG đọc/ghi `SMTP_PASS` |
| `OWNER_USER_ID` | (trống) | `users.id` của chủ web — mở khu quản trị `/admin/*`. **Trống = chặn hết (404)**, không phải mở hết; xem [kaitori.md](kaitori.md) |
| `XAI_API_KEY` | (trống) | Khoá API xAI cho nút quét giá 買取 trên X. Trống → chỉ tính năng đó tắt (503 kèm thông báo), web vẫn chạy bình thường |
| `CRON_SECRET` | (trống) | Khóa cho `POST /api/cron/kaitori-posts` (GitHub Actions gọi 4 tiếng/lần). **Trống = endpoint 404 (chặn hết).** Phải trùng secret cùng tên trên GitHub; xem [kaitori.md](kaitori.md) |
| `KAITORI_POSTS_MONTHLY_BUDGET` | `2000` | Trần số bài X Search được đọc mỗi tháng (JST) cho việc quét bài 買取 (~$5/1.000 bài). `0` = tắt quét. Chạm trần → bỏ qua tới đầu tháng |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` | (trống) | **Chỉ dùng ở máy local** cho `npm run news:images` (tạo ảnh minh hoạ tin trên `/kaitori`). KHÔNG cần đặt trên Vercel — ảnh tạo một lần rồi commit vào `public/news/`. Có cả hai thì dùng Gemini trước |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | (trống) | Có cả 2 → ảnh upload lên Supabase Storage; trống → lưu `public/uploads` |

Xem `.env.example`. `.env` đã gitignore.

## Vị trí dự án

Từ 2026-07-15 dự án nằm tại **`C:\dev\deal`** (ngoài OneDrive). Lịch sử: trước đây nằm trong OneDrive → OneDrive khóa file `.next` khi sync → dev server 500 ngẫu nhiên (`SyntaxError: Unexpected end of JSON input`). Đã fix triệt để bằng cách chuyển ra ngoài sau khi có GitHub backup. **KHÔNG chuyển dự án ngược vào thư mục được sync (OneDrive/Dropbox)** — lỗi sẽ quay lại (junction `.next` ra ngoài cũng KHÔNG dùng được — vỡ module resolution).

Lưu ý còn hiệu lực: **không chạy `npm run build` khi dev server đang chạy** (cả hai cùng ghi `.next`).

# Môi trường dev & troubleshooting

## Cài đặt & chạy

Yêu cầu: Node.js 20+.

```bash
cd deal
npm install
npx prisma migrate dev   # tạo db + generate client + seed tự động
npm run dev              # → http://localhost:3000
```

Dev server dùng **Turbopack** (`next dev --turbopack`, từ 2026-07-16) — compile nhanh hơn Webpack nhiều lần, hết khựng theo đợt khi vào route mới. Dev server chạy lâu ngày (>1 ngày) vẫn có thể suy thoái tích tụ → chậm bất thường (API 8–15s) thì cứ restart.

Tài khoản demo (seed sẵn, verified + đã accept terms): `demo@example.com` / `password123` (4 tài khoản khác: `taro|hanako|kenji|yuki@example.com`, cùng mật khẩu).

Lệnh khác:

```bash
npm test        # unit tests (vitest)
npm run build   # production build + typecheck — KHÔNG chạy khi dev server đang bật
npm run db:seed # chạy lại seed (idempotent)
```

## Biến môi trường

| Biến | Mặc định | Ghi chú |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | SQLite dev; Supabase Postgres khi deploy — xem [deploy.md](deploy.md) |
| `DIRECT_URL` | (trống) | Chỉ production (Postgres) — kết nối trực tiếp cho migrate |
| `APP_URL` | `http://localhost:3000` | URL gốc dùng trong link email |
| `SMTP_*` | (trống) | Xem [email.md](email.md) — ⚠️ KHÔNG đọc/ghi `SMTP_PASS` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | (trống) | Có cả 2 → ảnh upload lên Supabase Storage; trống → lưu `public/uploads` |

Xem `.env.example`. `.env` đã gitignore.

## Vị trí dự án

Từ 2026-07-15 dự án nằm tại **`C:\dev\deal`** (ngoài OneDrive). Lịch sử: trước đây nằm trong OneDrive → OneDrive khóa file `.next` khi sync → dev server 500 ngẫu nhiên (`SyntaxError: Unexpected end of JSON input`). Đã fix triệt để bằng cách chuyển ra ngoài sau khi có GitHub backup. **KHÔNG chuyển dự án ngược vào thư mục được sync (OneDrive/Dropbox)** — lỗi sẽ quay lại (junction `.next` ra ngoài cũng KHÔNG dùng được — vỡ module resolution).

Lưu ý còn hiệu lực: **không chạy `npm run build` khi dev server đang chạy** (cả hai cùng ghi `.next`).

# DEAL — bản đồ dự án (đọc file này trước, KHÔNG đọc toàn bộ docs/)

Web P2P trade thẻ TCG (Pokémon / One Piece) cho thị trường Nhật, **zero-fee**. Mục tiêu cốt lõi: thu thập **giá đóng (closing price)** đáng tin cậy làm nền cho AI dự đoán giá. Dự án portfolio cá nhân. UI tiếng Nhật, có switcher ja/vi/en.

## Làm gì → đọc file nào

| Việc cần làm | Chỉ cần đọc |
|---|---|
| Hiểu sản phẩm, core loop, vì sao có give-to-get | [docs/overview.md](docs/overview.md) |
| Sửa / thêm API endpoint | [docs/api/README.md](docs/api/README.md) (quy ước + map) → file domain tương ứng trong `docs/api/` |
| Đổi schema Prisma / thêm bảng | [docs/data-model.md](docs/data-model.md) |
| Đụng vào logic giá, trade, rating, gate | [docs/business-rules.md](docs/business-rules.md) — **các bất biến KHÔNG được phá** |
| Thêm/sửa chuỗi UI, ngôn ngữ, font | [docs/i18n.md](docs/i18n.md) |
| Email xác nhận / reset mật khẩu / SMTP | [docs/email.md](docs/email.md) |
| Chạy dev, biến env, lỗi 500 lạ | [docs/environment.md](docs/environment.md) |
| Tính năng tương lai / việc chưa làm | [docs/roadmap.md](docs/roadmap.md) |
| Lịch sử từng version | [CHANGELOG.md](CHANGELOG.md) |

`docs/api/` là **API contract chuẩn** — nguồn phân xử khi code và tài liệu mâu thuẫn (thay vai trò design.md cũ; bản gốc lưu `docs/_archive/`).

## Lệnh nhanh

- `npm run dev` → http://localhost:3000 — demo login: `demo@example.com` / `password123` (taro/hanako/kenji/yuki@example.com tương tự).
- `npm test` (Vitest, unit tầng service) · `npm run build` (**không chạy khi dev server đang bật** — cả hai cùng ghi `.next`).
- `npx prisma migrate dev` (tạo db + seed) · `npm run db:seed` (idempotent).

## Cảnh báo cứng (đọc trước khi sửa bất cứ gì)

1. **KHÔNG đặt dự án trong thư mục được sync (OneDrive/Dropbox)** — sẽ tái lỗi 500 ngẫu nhiên do sync khóa `.next`. Vị trí chuẩn: `C:\dev\deal`. Chi tiết: [docs/environment.md](docs/environment.md).
2. **KHÔNG bỏ font Noto Sans** (next/font, subset vietnamese) trong layout — bỏ là tái lỗi phông dấu tiếng Việt trên Windows.
3. **KHÔNG đọc/ghi `SMTP_PASS`** trong `.env` (Gmail App Password thật; `.env` đã gitignore).
4. Đổi `TERMS_VERSION` (`src/lib/terms.ts`) → toàn bộ user phải re-accept; **nhớ sync bản hardcode trong `prisma/seed.ts`**.
5. Chuỗi UI mới = thêm khóa vào `src/lib/messages.ts` **đủ 3 thứ tiếng** ja/vi/en. Ngoại lệ giữ tiếng Nhật: `/terms`, `/privacy`, lỗi từ server.
6. Kiến trúc bắt buộc: routes (`src/app/api/**`, chỉ validate zod) → services (`src/server/services/**`, logic + unit test) → repositories (`src/server/repositories/**`, mọi truy cập Prisma). Frontend chỉ fetch qua `src/lib/api-client.ts`.

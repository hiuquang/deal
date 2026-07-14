# DEAL — P2P TCG Trading Platform（手数料ゼロ）

Nền tảng web P2P cho người chơi TCG ở Nhật (Pokémon / One Piece) trao đổi thẻ trực tiếp, **không thu phí**. Mục tiêu cốt lõi: thu thập **giá đóng (closing price) đáng tin cậy** qua cơ chế **give-to-get** — muốn xem dữ liệu giá thị trường thì phải đóng góp ít nhất 1 giao dịch đã xác nhận.

Core loop MVP: **List thẻ → Chat → Xác nhận giao dịch → Lưu giá** (nhãn `confirmed` / `self-reported`).

## Tech stack

- **Next.js 15** (App Router) + **TypeScript** — full-stack 1 repo
- **Prisma + SQLite** (dev) — đổi sang Postgres khi deploy chỉ cần đổi `DATABASE_URL`
- **Tailwind CSS 4**, UI tiếng Nhật
- **Vitest** — unit test tầng service
- Auth: session cookie + email/password (bcrypt). LINE Login / SMS OTP → phase 2.

## Cài đặt & chạy

Yêu cầu: Node.js 20+.

```bash
cd deal
npm install
npx prisma migrate dev   # tạo db + generate client + seed tự động
npm run dev              # → http://localhost:3000
```

Tài khoản demo (seed sẵn): `demo@example.com` / `password123`
(4 tài khoản khác: `taro|hanako|kenji|yuki@example.com`, cùng mật khẩu.)

Lệnh khác:

```bash
npm test        # unit tests (vitest)
npm run build   # production build + typecheck
npm run db:seed # chạy lại seed (idempotent)
```

## Cấu trúc thư mục

```
deal/
├── CLAUDE.md              ← bản đồ dự án: làm gì đọc file nào
├── docs/                  ← tài liệu theo chủ đề; docs/api/ = API contract (nguồn chân lý)
├── prisma/
│   ├── schema.prisma      ← 8 bảng (users, cards, listings, conversations,
│   │                         messages, trades, price_records, sessions)
│   └── seed.ts            ← 5 users, 38 thẻ, 10 listing, 66 price records
├── src/
│   ├── app/               ← pages (App Router) + API route handlers
│   │   └── api/           ← routes: CHỈ validate + gọi service
│   ├── server/
│   │   ├── services/      ← business logic (unit test ở tests/)
│   │   ├── repositories/  ← mọi truy cập Prisma
│   │   ├── session.ts     ← session cookie (bảng sessions)
│   │   ├── validation.ts  ← zod schemas + "enum" values
│   │   └── errors.ts      ← ApiError + error response thống nhất
│   ├── components/        ← React components (client)
│   └── lib/
│       ├── api-client.ts  ← tầng gọi API duy nhất của frontend
│       └── types.ts       ← DTO dùng chung FE/BE
└── tests/                 ← vitest (28 tests)
```

## Biến môi trường

| Biến | Mặc định | Ghi chú |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | SQLite dev; Postgres khi deploy |
| `APP_URL` | `http://localhost:3000` | URL gốc dùng trong link email |
| `SMTP_HOST/PORT/USER/PASS/FROM` | (trống) | Trống → email vào hộp thư dev `/dev/mailbox`. Muốn gửi Gmail thật: bật 2FA → tạo App Password tại myaccount.google.com/apppasswords → điền `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=địa chỉ Gmail`, `SMTP_PASS=app password` |

Xem `.env.example`.

## Xác thực (Phase 4)

- Đăng ký → nhận mail xác nhận (link hạn 24h). Chưa xác nhận: xem thoải mái nhưng **không đăng tin/mua/comment/chat/trade** được.
- Quên mật khẩu: link "パスワードをお忘れですか？" ở trang login → mail reset (hạn 1h) → đổi xong tự đăng xuất mọi thiết bị.
- Dev chưa có SMTP: mở `/dev/mailbox` để xem mail và bấm link.

## Thiết kế quan trọng (đầy đủ: docs/business-rules.md + docs/overview.md)

- **Tách 3 luồng**: xác nhận giao dịch / rating / lưu giá. Giá được lưu NGAY khi trade chốt, không gate bằng rating (chống selection bias). Rating chưa có trong MVP.
- **Chống khai láo giá**: bên xác nhận sau phải nhập đúng số tiền bên khởi tạo đã khai (`PRICE_MISMATCH` nếu lệch).
- **Tự chốt sau 7 ngày**: trade pending không được phản hồi → `self_reported` (lazy-check khi có request, không cần cron).
- **Ẩn danh từ schema**: bảng `price_records` không có cột user nào.
- **Give-to-get**: `GET /api/prices/:cardId` trả `403 NEED_CONTRIBUTION` (kèm teaser số record) nếu user chưa đóng góp giao dịch nào.
- **Catalog chuẩn hóa**: user chỉ chọn thẻ qua autocomplete từ bảng `cards`, condition là field bắt buộc.
- **Rating blind-mutual** (Phase 2): mỗi bên rate 1 lần sau khi trade chốt, ẩn đến khi cả 2 đã rate — chống trả đũa; ★ trung bình chỉ tính từ rating đã reveal.
- **Flag giá bất thường** (Phase 2): record lệch >50% median thị trường bị gắn ⚠ và loại khỏi stats/chart — chống thông đồng bơm giá phá model AI.
- **Report user** (Phase 2): nút 通報 trên listing.
- **BOX thẻ sealed** (Phase 3): loại sản phẩm riêng với condition シュリンク付き/なし, tab lọc riêng, dữ liệu giá riêng.
- **Bình luận công khai** (Phase 3): dưới mỗi listing, ai cũng đọc, đăng nhập mới viết.
- **Luồng mua 購入希望 → 連携** (Phase 3): thay thế chat trực tiếp — seller thấy danh sách người muốn mua (kèm ★ uy tín) và toàn quyền chọn ai để mở chat riêng.
- **利用規約 & プライバシーポリシー** (Phase 5): `/terms` + `/privacy` (bản mẫu, nên nhờ luật sư rà trước khi vận hành thật); đồng ý bắt buộc khi đăng ký + modal re-accept khi đổi `TERMS_VERSION` (`src/lib/terms.ts` — nhớ sync bản hardcode trong `prisma/seed.ts`); server chặn `403 TERMS_NOT_ACCEPTED`.

## Troubleshooting

**Lỗi 500 ngẫu nhiên khi `npm run dev`** (log: `SyntaxError: Unexpected end of JSON input`): dự án nằm trong thư mục OneDrive — OneDrive khóa file trong `.next` khi sync. Cách xử lý: tạm dừng OneDrive sync khi dev (icon OneDrive → 一時停止), hoặc bỏ sync thư mục `deal` (OneDrive 設定 → アカウント → フォルダーの選択), hoặc chuyển dự án ra ngoài OneDrive (vd `C:\dev\deal`) sau khi đã đưa code lên GitHub. Không chạy `npm run build` khi dev server đang chạy (cả hai cùng ghi `.next`).

## Roadmap V3 (cần tài khoản/dịch vụ ngoài)

LINE Login · SMS OTP chống Sybil · push/email notification nhắc xác nhận · tích hợp Pokémon TCG API · cloud storage cho ảnh · deploy Vercel + Supabase · AI dự đoán giá.

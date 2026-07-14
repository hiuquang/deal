# Roadmap & việc chưa làm

## Việc nên làm kế tiếp

- ~~Tạo repo GitHub và push code~~ — **XONG 2026-07-15**: https://github.com/hiuquang/deal (nhánh `main`).
- ~~Chuyển dự án ra ngoài OneDrive~~ — **XONG 2026-07-15**: dự án giờ ở `C:\dev\deal` (đã copy `.env`, `prisma/dev.db`, `public/uploads/`, `docs/_archive/`; 49 test pass, app verify OK). Bản cũ trên OneDrive chờ user tự xóa.
- Nhờ luật sư rà `/terms` `/privacy` trước khi vận hành thương mại thật (hiện là bản mẫu).

## V-next — cần tài khoản/dịch vụ ngoài

- LINE Login (cần LINE Developers account), Sign in with Apple.
- SMS OTP chống Sybil (dịch vụ SMS trả phí) — kèm chặn tạo lại tài khoản cùng SĐT.
- Push notification / email nhắc xác nhận trade sau 1–2 ngày (thay lazy-check bằng scheduled job).
- Tích hợp Pokémon TCG API / One Piece card DB để mở rộng catalog tự động (catalog hiện seed tĩnh, có thể sai vài chi tiết rarity).
- Cloud storage cho ảnh (hiện lưu local `public/uploads/`).
- Deploy Vercel + Supabase Postgres.
- Chuyển sang Gmail riêng của dự án khi bật được 2FA (xem [email.md](email.md)).

## Ý tưởng (chưa cam kết)

- AI dự đoán giá (cần đủ dữ liệu thật trước).
- Seed giá tham khảo từ TCGplayer / Yahoo Auction cho giai đoạn cold start.
- Lọc listing theo ga/tuyến tàu (đã có cột `station` từ 0.6.1).
- WebSocket/Pusher thay polling chat.
- Admin dashboard cho reports.
- App native.

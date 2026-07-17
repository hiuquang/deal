# Roadmap & việc chưa làm

## Việc nên làm kế tiếp

- ~~Tin gom số lượng lớn (まとめ買い)~~ — **XONG cả 2 giai đoạn 2026-07-16**: GĐ1 bảng tin + chào bán + kết nối chat riêng (0.8.0); GĐ2 chốt trade + ghi giá theo ĐƠN GIÁ, khai condition/số lượng lúc chốt, khớp cả giá lẫn số lượng (0.9.0). Ý tưởng sau: theo dõi số lượng đã gom / tự đóng tin khi đủ.
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

## Profile & Trust System — phần hoãn từ spec v2 (0.10.0 đã làm phần lõi)

Đã có (0.10.0): trang hồ sơ công khai `/users/:id`, Trust Score, XP/Level/Tier,
badge, thống kê, Trust & Safety 🟢🟡🔴 + cảnh báo trước khi chốt trade.
Còn lại của spec, hoãn vì cần hạ tầng chưa có:

- **Admin dashboard duyệt report** (đang duyệt tay ở DB) — điều kiện để 🔴 vận hành thật.
- Online status (cần presence/heartbeat), Follow (social graph + notification).
- Avatar upload (mở surface moderation ảnh hồ sơ — cân nhắc sau khi có admin).
- Badge Fast Reply / Fast Trade + "thời gian phản hồi" (cần đo timing tin nhắn).
- XP đăng nhập liên tục / XP đăng tin (cần bảng sự kiện + chống farm; nguồn XP hiện tại cố ý chỉ từ giao dịch thật).
- Animation lên hạng, khung avatar, vật phẩm trang trí, VIP member.
- Bộ sưu tập nổi bật (cần tính năng collection riêng, khác listing đang bán).

## Ý tưởng (chưa cam kết)

- AI dự đoán giá (cần đủ dữ liệu thật trước).
- Seed giá tham khảo từ TCGplayer / Yahoo Auction cho giai đoạn cold start.
- Lọc listing theo ga/tuyến tàu (đã có cột `station` từ 0.6.1).
- WebSocket/Pusher thay polling chat.
- App native.

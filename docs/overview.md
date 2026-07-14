# Tổng quan sản phẩm

DEAL là nền tảng web P2P kết nối người chơi TCG (Pokémon, One Piece) ở Nhật để trao đổi/mua bán thẻ trực tiếp với nhau, **hoàn toàn miễn phí**. Mục tiêu cốt lõi không phải doanh thu giao dịch mà là **thu thập dữ liệu giá đóng (closing price) đáng tin cậy** làm nền cho AI dự đoán giá sau này.

Vì không có escrow/phí, động lực duy nhất để user xác nhận giao dịch là cơ chế **give-to-get**: phải đóng góp ít nhất 1 giao dịch đã xác nhận mới được xem dữ liệu giá thị trường.

**Người dùng mục tiêu**: người sưu tầm/trader thẻ TCG tại Nhật, quen dùng Mercari/Magi nhưng khó chịu với phí và thiếu dữ liệu giá minh bạch.

**Bối cảnh dự án**: portfolio cá nhân, nhắm thị trường tuyển dụng Nhật — UI tiếng Nhật là chủ đích.

## Core loop

```
Đăng listing (active)
  → buyer bấm 購入希望 → seller xem danh sách người muốn mua (kèm ★ uy tín)
  → seller bấm 連携する → sinh conversation riêng → chat
  → 1 bên POST /trades kèm giá đóng cuối cùng
  → bên kia confirm (giá phải khớp) → trade = confirmed → tạo price_record NGAY
  → (hoặc quá 7 ngày im lặng → tự chốt self_reported → vẫn tạo price_record)
  → trang giá /prices/:cardId — chỉ mở khi user đã đóng góp ≥1 trade
```

## Tính năng theo phase (đã hoàn thành đến v0.6.1)

| Phase | Nội dung chính |
|---|---|
| MVP 0.1.0 | Auth email/password, catalog ~60 thẻ chuẩn hóa (autocomplete, không gõ tự do), listing (condition bắt buộc + ảnh thật ≤5MB), chat polling, trade confirm + lưu giá, give-to-get gate, trang giá chart |
| 0.2.0 | Rating blind-mutual, flag giá outlier, report user (通報), badge uy tín ★ |
| 0.3.0 | BOX sealed (category riêng + condition シュリンク付き/なし), bình luận công khai, luồng mua 購入希望→連携 (GỠ POST /api/conversations) |
| 0.4.x | Xác nhận email (chặn hành động ghi khi chưa verify), quên mật khẩu, hạ tầng mail (SMTP thật / dev mailbox) |
| 0.5.0 | 利用規約 /terms + プライバシーポリシー /privacy, đồng ý bắt buộc 2 tầng + versioning |
| 0.6.x | Logo mới, i18n ja/vi/en, cột ga tàu gần nhất (最寄り駅) trên listing |

Chi tiết từng version: [CHANGELOG.md](../CHANGELOG.md). Việc chưa làm: [roadmap.md](roadmap.md).

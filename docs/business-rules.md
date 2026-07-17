# Quy tắc nghiệp vụ cốt lõi (các bất biến KHÔNG được phá)

Đây là những quyết định thiết kế có chủ đích để bảo vệ **chất lượng dữ liệu giá** — tài sản chính của dự án. Sửa code đụng vào các luồng này phải giữ nguyên các bất biến sau.

## Dữ liệu giá

1. **Giá lưu NGAY khi trade chốt, tách hoàn toàn khỏi rating** — `price_record` được tạo đúng 1 lần khi trade sang `confirmed` hoặc `self_reported`. Rating KHÔNG gate việc lưu giá → chống selection bias (nếu chỉ lưu giá của trade được rate tốt, dataset sẽ méo).
2. **Chống khai láo giá (PRICE_MISMATCH)** — bên xác nhận sau phải tự nhập đúng số tiền bên khởi tạo đã khai; lệch → `409 PRICE_MISMATCH`. UI và API **không bao giờ để bên xác nhận thấy giá bên kia đã khai** (đã từng là bug, fix ở 0.2.0).
3. **Ẩn danh từ tầng schema** — `price_records` không có bất kỳ cột user nào; bảng này an toàn để public/export cho AI.
4. **Asking price KHÔNG BAO GIỜ vào dữ liệu giá thị trường** — chỉ để thương lượng; chỉ giá đóng (closing price) từ trade mới thành price_record.
5. **Trade kiểu trao đổi (`trade_type=trade`) vẫn bắt nhập giá trị quy đổi JPY** khi xác nhận — mọi giao dịch chốt đều sinh data point.
6. **Flag giá bất thường (P2)** — khi tạo price_record, nếu đã có ≥3 record chưa-flag cùng (card, condition) và giá lệch >50% so với median của chúng → `flagged=true`. Record bị flag vẫn hiển thị (kèm ⚠ 外れ値の可能性) nhưng **loại khỏi stats và chart**. Trade không bị chặn — chỉ gắn nhãn dữ liệu.
7. **Give-to-get** — `GET /api/prices/:cardId` trả `403 NEED_CONTRIBUTION` (kèm teaser `recordCount`) khi user chưa có ≥1 trade chốt (confirmed/self_reported).

## Trade

8. **Auto-close 7 ngày** — trade pending không được phản hồi → tự chốt `self_reported`, lazy-check khi có request đọc trade/price (không cron). Lazy-check có throttle 1 phút/process — độ trễ tối đa 1 phút là chấp nhận được vì `autoCloseAt` tính theo ngày.
9. **1 listing chỉ có 1 trade chưa-cancelled** (`409 TRADE_EXISTS`). Listing sang `in_trade` khi có trade pending, `closed` khi chốt, mở lại `active` khi trade cancel. Ép ở **cả 2 tầng**: check sớm trong service (UX) + partial unique index `trades_one_active_per_listing` ở DB (tuyến phòng thủ cuối, chặn race condition khi 2 request đến gần như cùng lúc — xem migration `add_active_trade_partial_unique_index`). Service bắt lỗi Prisma `P2002` từ insert và dịch thành cùng mã lỗi `TRADE_EXISTS`.
10. **Giá hợp lệ**: 1 ~ 10.000.000 JPY.

## Uy tín & chống lạm dụng

11. **Rating blind-mutual (P2)** — chỉ rate được trade đã chốt, mỗi bên đúng 1 lần; rating đối phương **ẩn cho đến khi cả 2 đã rate** (chống trả đũa). ★ trung bình chỉ tính từ rating đã reveal.
12. **Seller toàn quyền chọn đối tác (P3)** — conversation CHỈ sinh ra qua luồng 購入希望 → seller 連携 (`POST /api/conversations` đã GỠ khỏi contract). Seller thấy ★ uy tín của từng buyer trước khi connect.
12b. **Tin gom số lượng lớn (P8, luồng đảo chiều)** — người *mua* đăng `buy_order` (thẻ + số lượng + đơn giá tối đa); người *bán* đăng chào bán công khai (`buy_order_offers`: số lượng + lời nhắn). CHỈ chủ tin (người mua) được `connect` 1 chào bán → sinh conversation riêng (đối xứng với quy tắc 12). Người bán không tự chào bán tin của mình (`409 OWN_ORDER`), 1 chào bán/người bán/tin (`409 ALREADY_OFFERED`). `conversations.seller_id` lưu trực tiếp (hỗ trợ cả 2 nguồn listing/buy_order).

12c. **Trade từ tin gom (P9)** — `finalPriceJpy` là **ĐƠN GIÁ** (giá/1 bản), price_record ghi đơn giá (so sánh được giữa giao dịch 1 bản và 20 bản). Bên khởi tạo khai condition (khớp category → `400 CONDITION_MISMATCH`) + số lượng; bên xác nhận phải nhập lại **đúng cả đơn giá lẫn số lượng** (`PRICE_MISMATCH`/`QUANTITY_MISMATCH`) — mở rộng cơ chế chống khai láo. 1 hội thoại chỉ có 1 trade còn sống (partial unique index `trades_one_active_per_conversation` — mở rộng quy tắc 9). Tin gom KHÔNG tự đóng khi trade chốt (nhiều người bán cùng gom); card_id/condition/quantity denormalize trên `trades` (nguồn duy nhất cho price_record, hết phụ thuộc listing).

13. **Catalog chuẩn hóa** — user chỉ chọn thẻ qua autocomplete từ bảng `cards`, không gõ tên tự do; `condition` bắt buộc và phải khớp `category` (`400 CONDITION_MISMATCH`). **Ngoại lệ có chủ đích: mục その他 (`game=other`)** — sản phẩm ngoài Pokémon/One Piece không có catalog nên user tự đặt tên qua `POST /api/cards` (find-or-create theo tên + category, dedupe ở DB). Dữ liệu giá của `other` KHÔNG thuộc dataset lõi cho AI (dataset lõi vẫn là 2 game có catalog chuẩn); Pokémon/One Piece tuyệt đối không đi qua đường này.
14. **Không tự report mình** (`409 SELF_REPORT`); reason 10–500 ký tự.

## Gate hành động ghi (2 tầng, kiểm tại `requireVerifiedUser`)

15. **Email chưa xác nhận** → mọi hành động ghi (đăng tin, upload, comment, 購入希望, connect, chat, trade, rating, report) trả `403 EMAIL_NOT_VERIFIED`. Xem thoải mái, ghi thì không.
16. **Chưa đồng ý 利用規約 bản hiện hành** → `403 TERMS_NOT_ACCEPTED`; UI hiện modal TermsGate chặn toàn màn hình. `TERMS_VERSION` ở `src/lib/terms.ts` — đổi version là toàn bộ user phải re-accept; **sync bản hardcode trong `prisma/seed.ts`**.

## Bảo mật auth

17. `POST /api/auth/forgot` **luôn trả `{ok:true}`** — không lộ email nào tồn tại.
18. Reset mật khẩu thành công → **xóa toàn bộ session cũ** (đăng xuất mọi thiết bị).
19. Token email dùng 1 lần, có hạn (verify 24h, reset 1h).

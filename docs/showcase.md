# Chế độ trưng bày tin đã bán

Tin **ĐÃ BÁN** vẫn nằm trên bảng tin (ảnh xám + băng chéo đỏ "SOLD", dồn xuống cuối) thay vì biến mất. Có từ v0.26.0.

## Vì sao

Web còn ít người dùng. Tin bán xong biến mất ngay làm chợ trông trống trơn như đã chết — người mới ghé vào thấy vài tin lẻ tẻ thì không tin đây là chỗ giao dịch thật. Giữ tin đã bán lại vừa lấp trang vừa chứng minh **ở đây có giao dịch thật xảy ra**.

## Bật / tắt

| | |
|---|---|
| **Mặc định** | BẬT |
| **Tắt** | Đặt env `SHOW_SOLD_LISTINGS=off` trên Vercel → **Redeploy** |
| **Bật lại** | Xóa biến đó (hoặc đặt giá trị khác) → Redeploy |

Nhận là "tắt": `off` · `false` · `0` · `no` (không phân biệt hoa thường, tự trim). **Giá trị lạ KHÔNG tắt** — tránh gõ nhầm làm mất tính năng mà không ai biết. Có test phủ.

⚠️ Bảng tin công khai có cache CDN 15s (`PUBLIC_LIST_CACHE`) → sau khi redeploy, chờ ~15s mới thấy đổi trên mọi thiết bị.

Cố ý **KHÔNG tự tắt theo số người dùng** — chủ web đã chốt là chỉ tắt khi ra lệnh (2026-07-30).

## Quy tắc

- **CHỈ `closed` (đã bán). KHÔNG BAO GIỜ `cancelled`** (chủ tin tự gỡ, không hề bán được). Dán chữ SOLD lên tin bị gỡ là nói sai sự thật về thị trường — có test khóa lại.
- Tin đã bán **luôn dồn xuống cuối** bảng tin, sau tin đang bán và tin đăng mua. Chúng chỉ để trang đỡ trống, không được đẩy hàng còn mua được xuống dưới. Sắp xếp ở `home-board.tsx` (`daBan` là khóa sắp xếp đầu tiên).
- Trang chi tiết tin đã bán **vẫn mở được** (xem ảnh, giá chốt, bình luận) nhưng **không mua được**: panel mua ẩn hoàn toàn, kể cả lời mời đăng nhập với khách.
- `mine=1` (trang cá nhân) không bị ảnh hưởng — vẫn hiện mọi trạng thái của chính chủ.

## Chỗ cần sửa nếu đổi hành vi

`src/server/showcase.ts` là nguồn sự thật duy nhất; API route (`/api/listings`) và SSR trang chủ (`page.tsx`) đều gọi `trangThaiHienTrenCho()` — **giữ hai đường này gọi chung một hàm**, lệch nhau sẽ gây nhảy nội dung giữa SSR và client fetch.

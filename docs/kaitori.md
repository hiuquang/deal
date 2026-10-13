# Thu thập giá 買取 từ X (qua Grok)

買取 = giá **shop THU VÀO** từ khách. Đây là **giá sàn**: mức bạn chắc chắn bán được ngay hôm nay, không cần chờ ai. Có nó thì luận điểm phí 0% của DEAL thành con số cụ thể thay vì lời quảng cáo:

> Shop thu vào ¥11.000, người ta rao ¥14.587. Trade tay đôi ở ¥12.794 — người bán được thêm, người mua trả ít hơn.

## Nguyên tắc không được phá

**Grok ĐỀ XUẤT, người DUYỆT.** Mô hình ngôn ngữ đọc tweet sẽ sai thường xuyên: nhầm thẻ, nuốt mất chữ 最大/「〜まで」, tưởng bài đăng lại là bài mới. Mục tiêu lõi của DEAL là dataset giá sạch cho AI dự giá — đổ thẳng output LLM vào đó là đầu độc đúng thứ cả dự án tồn tại vì nó.

Vì vậy luồng tách làm hai, **không được gộp**:

1. `POST /api/kaitori/scan` → Grok quét X, trả đề xuất. **Không ghi gì vào DB.**
2. Chủ web duyệt từng dòng ở `/admin/kaitori`, **tự gắn thẻ trong catalog** (Grok không tự gắn được).
3. `POST /api/kaitori/import` → chỉ dòng đã duyệt mới vào `reference_prices`.

Mỗi dòng lưu kèm `source_url` (link tweet gốc) để truy ngược khi con số trông lạ.

## Vì sao hợp lệ (khác vụ SNKRDUNK đã từ chối ở v0.30.0)

- Dùng **chính API xAI bán ra**, đúng mục đích — không cào lén.
- Giá 買取 do shop **cố ý đăng công khai** để mời khách mang thẻ tới bán.
- Ta ghi lại **dữ kiện** (con số, ngày, shop), không sao chép nội dung hay ảnh của ai.

SNKRDUNK thì ngược lại: điều khoản của họ cấm thẳng việc hiển thị lại thông tin lấy từ dịch vụ và cấm dùng thương mại khi chưa xin phép.

## Cấu hình

| Env | Bắt buộc | Ghi chú |
|---|---|---|
| `OWNER_USER_ID` | có | `users.id` của chủ web. **Thiếu → chặn hết (404)**, không phải mở hết. |
| `XAI_API_KEY` | có | Lấy ở <https://console.x.ai>, cần gắn thẻ thanh toán. Thiếu → nút quét trả 503 với thông báo rõ, phần còn lại của web không ảnh hưởng. |

Lấy `OWNER_USER_ID`: Supabase → Table Editor → `users` → copy `id` của tài khoản chủ web.

## Chi phí

X Search tính **~$5 / 1.000 bài** Grok đọc, cộng token model (Grok 4.7 ~$2/M input, $6/M output). Quét vài chục bài một lượt nên tính bằng cent. Trần an toàn trong code: tối đa 20 handle, tối đa 14 ngày ngược, `max_turns: 2`.

⚠️ **Mỗi lần bấm "Quét" là tốn tiền thật.** Endpoint chỉ nhận POST và chỉ chủ web gọi được — không bao giờ mở công khai, không bao giờ để ở GET (dán link là kích hoạt được).

## Danh sách shop

`DEFAULT_SHOP_HANDLES` trong `src/server/services/kaitori-service.ts`. Để trong code chứ không phải env: đây là tri thức về thị trường, sửa thì sửa kèm review, không phải thứ đổi theo môi trường triển khai. Chủ web vẫn sửa được tạm thời ngay trên trang `/admin/kaitori`.

## Ba loại giá — KHÔNG trộn

Cột `reference_prices.kind`:

| kind | Nghĩa | Nguồn |
|---|---|---|
| `kaitori` | Shop thu vào — **giá sàn** | X, qua Grok |
| `ban` | Đã bán xong | Facebook, nhập tay |
| `rao` | Đang rao (mặc định) | Facebook, nhập tay |

Trang giá hiện **ba nhóm riêng, mỗi nhóm một thống kê**. Trộn chung ra con số vô nghĩa mà nhìn vẫn như thật — đây là lỗi tồn tại từ v0.21.0 tới v0.31.0 (nhãn `source` chỉ để hiển thị, không tách thống kê), sửa ở v0.32.0. **Đừng gộp lại.**

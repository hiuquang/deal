-- Bất biến nghiệp vụ: 1 listing chỉ được có 1 trade "còn sống" (status != cancelled)
-- tại một thời điểm. Trước đây quy tắc này chỉ được kiểm ở tầng service
-- (check-then-insert trong trade-service.ts create()), nên 2 request POST /trades
-- đến gần như cùng lúc có thể cùng lọt qua check và tạo ra 2 trade active cho
-- cùng 1 listing → 2 price_record cho cùng 1 giao dịch thật → bẩn dữ liệu giá.
--
-- Partial unique index ép quy tắc này ở tầng DB — tuyến phòng thủ cuối cùng,
-- không phụ thuộc code có bug hay race condition hay không.
CREATE UNIQUE INDEX "trades_one_active_per_listing" ON "trades" ("listing_id") WHERE "status" != 'cancelled';
# CHANGELOG

## [0.9.3] — 2026-07-17 — Trang chủ server-render lượt đầu + function về region Sydney

### Hiệu năng
- **Trang chủ SSR dữ liệu lượt tải đầu**: `page.tsx` thành server component gọi thẳng `listingService.list` (validate zod như API route), truyền `initial` xuống `HomeBoard` (client) — mở trang thấy tin ngay, hết spinner 読み込み中. Client skip fetch đầu khi bộ lọc khớp key SSR; SSR lỗi (pooler nguội) → fallback client-fetch như cũ, trang không chết. SSR tôn trọng `?q/game/category` trên URL (link chia sẻ ra đúng kết quả ngay từ HTML).
- **`useBoardFilters` sync URL bằng `history.replaceState`** thay `router.replace` — router.replace trên trang dynamic kéo theo một vòng RSC chạy lại query DB thừa MỖI lần đổi bộ lọc/gõ tìm kiếm. Đã verify: đổi filter = đúng 1 call `/api/listings`, 0 call RSC (áp dụng cả まとめ買い).
- **`vercel.json` ghim function về `syd1`** — mặc định Vercel chạy US trong khi DB Supabase ở Sydney; mỗi request Prisma tốn nhiều vòng US↔Sydney. Đổi region DB thì nhớ sửa cả đây.

### Kiểm thử
- 122 test pass, build sạch (`/` chuyển ○ static → ƒ dynamic — chủ đích). Verify browser: SSR HTML chứa listing + đếm đúng, reload tại `?game=onepiece` ra 0件 không spinner không refetch, filter 2 bảng tin hoạt động, console sạch.

## [0.9.2] — 2026-07-17 — Sửa tràn thanh nav trên điện thoại

### Sửa lỗi
- **Nav gom vào menu hamburger dưới breakpoint `sm`**: trên iPhone (375px) tổng bề rộng logo + 5 mục + nút ngôn ngữ vượt màn hình; chữ Nhật không có dấu cách nên trình duyệt được ngắt dòng giữa từng ký tự → 出品する/まとめ買い/ログアウト xếp dọc và bị cắt. Nay mobile chỉ còn logo + cờ ngôn ngữ + nút menu; mọi mục nằm trong panel xổ xuống (tự đóng khi đổi route). Desktop (`sm`+) giữ nguyên hàng ngang, thêm `whitespace-nowrap` chặn tái phát.
- Huy hiệu tin chưa đọc: menu đóng thì hiện **chấm đỏ** trên nút hamburger (số đầy đủ nằm trong panel) → không mất tín hiệu thông báo trên mobile.
- Tên hiển thị dài không còn đẩy tràn nav (`truncate`, giới hạn `8rem` ở desktop).
- Chuỗi mới `nav.menu` (ja/vi/en) cho aria-label nút hamburger.

## [0.9.1] — 2026-07-16 — Dọn code sau 2 giai đoạn tin gom (review 4 góc: tái dùng / đơn giản / hiệu năng / độ sâu)

### Hiệu năng
- **Batch N+1 ở `GET /api/buy-orders/:id/offers`** (endpoint công khai, nóng): trước mỗi chào bán tốn 3–4 query (uy tín người bán + hội thoại); nay 4 query cho CẢ danh sách (`getUserSummaries` + `listBuyOrderConversations`).
- **Thêm index `conversations(buyer_id)` + `(seller_id)`** — phục vụ poll tin chưa đọc 15s/user (query nóng nhất app), trước đây quét cả bảng.

### Làm sạch kiến trúc
- **`trades` repo hợp nhất**: `createTrade`/`cancelTrade` nhận `listingId` nullable (mirror pattern `closeTrade`) thay cho 4 hàm đôi; `trade-service.create` gộp 2 nhánh thành guard-theo-nguồn + 1 đuôi chung (1 catch P2002); bỏ pre-check trùng với index DB; bỏ nhánh chết `TRADE_NOT_SUPPORTED`.
- **`conversations.seller_id` siết NOT NULL** (migration; backfill từ P8 đã phủ 100%) → hết `!`/`?? ""` giả định ngầm; `ConversationDto` thành **union phân biệt theo `kind`** (check `kind==="listing"` là TS tự thu hẹp — xóa 4 chỗ `!` ở chat). `TradeDto` bỏ trường `listing` chết (không consumer nào dùng — trade đã denormalize card/condition) kèm join thừa mỗi lần list trade.
- **Trích dùng chung**: `assertConditionMatchesCategory` (validation.ts — trước lặp ở listing-service + trade-service), `useBoardFilters` + `FilterTabs` (board-filters.tsx — trang chủ và まとめ買い trước lặp ~110 dòng máy lọc/URL-sync), `GameCategoryPicker` (2 form đăng tin), `tests/helpers.ts` (expectApiError trước copy 8 lần).
- Check khớp số lượng khi xác nhận trade nay đồng nhất mọi loại trade (listing quantity=1 tự khớp).

### Kiểm thử
- 118 test pass (cập nhật mock theo repo API mới). `tsc` sạch. Verify browser: 2 bảng tin + lọc URL, chat 2 loại (trade pending listing + trade chốt buy-order), `/me`, trang chi tiết tin gom — không lỗi console/server.

## [0.9.0] — 2026-07-16 — Tin gom số lượng lớn — Giai đoạn 2: chốt giao dịch + ghi nhận giá

### Tính năng
- **Chat buy-order chốt trade + ghi giá được** (bỏ `TRADE_NOT_SUPPORTED`): bên khởi tạo khai **đơn giá (giá/1 bản) + số lượng + condition** (select theo loại thẻ — tin gom không khai condition); bên xác nhận nhập lại **đúng cả đơn giá lẫn số lượng** (`PRICE_MISMATCH`/`QUANTITY_MISMATCH` — mở rộng cơ chế chống khai láo, số đã khai vẫn ẩn với bên xác nhận).
- `price_records.price_jpy` ghi **đơn giá** → dữ liệu giá so sánh được giữa giao dịch 1 bản và N bản. Outlier flag/auto-close 7 ngày/rating blind-mutual áp dụng nguyên vẹn.
- Tin gom KHÔNG tự đóng khi trade chốt (chủ tin gom từ nhiều người bán, tự gỡ khi đủ). `/me` hiện ×n cho trade nhiều bản.

### Nền tảng
- **Tổng quát hóa `Trade`** (mirror cách làm Conversation ở 0.8.0): `listing_id` nullable + thêm `buy_order_id`; **denormalize `card_id`/`condition`/`quantity`** lên trades — nguồn duy nhất cho price_record, hết phụ thuộc listing. Migration backfill 104 trade cũ từ listing (JOIN trong INSERT, verify 0 lệch).
- Chống race mở rộng: partial unique index mới `trades_one_active_per_conversation` (WHERE status != cancelled) — 1 hội thoại chỉ 1 trade sống, bọc luôn cả trade listing; service bắt P2002 → `409 TRADE_EXISTS`.

### Kiểm thử
- 119 unit test pass (+11: create/confirm/cancel/auto-close nhánh buy-order, QUANTITY_MISMATCH, race P2002, condition mismatch). Verify browser end-to-end: demo khai ¥75.000×8 RAW_NM → taro nhập sai số lượng bị chặn → nhập đúng → chốt confirmed → price_record ghi đơn giá ¥75.000 (kiểm DB); trade listing cũ + quyền thành viên chat không đổi hành vi.

## [0.8.0] — 2026-07-16 — Tin gom số lượng lớn (まとめ買い募集) — Giai đoạn 1

### Tính năng
- **Luồng đảo chiều**: người *mua* đăng tin "cần gom N bản của 1 thẻ" → người *bán* chào bán công khai → người mua chọn 1 người bán → chat riêng.
  - Trang `/buy-orders` (bảng tin, tìm/lọc theo thẻ/game/loại), `/buy-orders/new` (form: thẻ + số lượng 1–999 + đơn giá tối đa tùy chọn), `/buy-orders/:id` (chi tiết + **danh sách chào bán công khai**).
  - Người bán đăng **chào bán** (số lượng bán được + lời nhắn ≤300). Chủ tin thấy mỗi chào bán kèm ★ uy tín người bán → nút 連携 → tạo conversation riêng → chuyển vào `/chat`.
  - Bảng mới `buy_orders`, `buy_order_offers`. Endpoint `/api/buy-orders*` (xem [docs/api/buy-orders.md](docs/api/buy-orders.md)). Guard: tạo tin/chào bán/kết nối cần verified; không tự chào bán tin mình (`OWN_ORDER`); 1 chào bán/người bán/tin (`ALREADY_OFFERED`); chỉ chủ tin được kết nối.
  - Nav thêm link **まとめ買い**; hội thoại từ buy-order có nhãn riêng trong `/chat`. Đủ 3 ngôn ngữ ja/vi/en.

### Nền tảng
- **Tổng quát hóa `Conversation`**: `listing_id` thành nullable, thêm `buy_order_id` + `seller_id` (lưu người bán trực tiếp thay vì luôn suy từ `listing.seller_id`). Migration **backfill** `seller_id` cho 106 hội thoại cũ → seller-detection 1 code path. Hội thoại listing cũ + TradePanel **không đổi hành vi** (đã verify).

### Giới hạn có chủ đích (Giai đoạn 2)
- Chốt giao dịch + **ghi giá** từ tin gom CHƯA làm — conversation buy-order không hiện TradePanel; `POST /api/trades` cho loại này trả `409 TRADE_NOT_SUPPORTED`. Lý do: `price_records` cần condition mà tin gom không khai → sẽ nhập lúc chốt ở Giai đoạn 2.

### Kiểm thử
- 108 unit test pass (thêm `buy-order-service` + `buy-order-offer-service`). `tsc` sạch. Verify browser end-to-end: tạo tin → chào bán (taro) → kết nối (demo) → chat riêng OK; hội thoại listing cũ vẫn chạy.

## [0.7.3] — 2026-07-16 — Dòng nhắc chống lừa đảo

### Tính năng
- **Dòng nhắc an toàn màu đỏ** (component dùng chung `SafetyNote` trong `ui.tsx`, ⚠️ + chữ đỏ nhỏ) nhắc người dùng cảnh giác lừa đảo (đòi trả trước / hàng giả / tráo hàng) và kiểm tra kỹ hiện vật, xuất hiện ở 2 nơi trong luồng giao dịch:
  - **Chat** (`safety.chat`): băng đỏ nhạt trong header hội thoại.
  - **Bước xác nhận giao dịch** (`safety.confirm`, mạnh hơn — nhấn mạnh không hoàn tác): trong khối xác nhận của bên nhận, trên nút 確認する.
- Đặt trong luồng liên hệ/giao dịch, KHÔNG đặt ở trang chi tiết sản phẩm (tránh gây cảm giác chính món hàng có vấn đề). Đủ 3 ngôn ngữ ja/vi/en. Không đổi API/schema.

### Sửa lỗi
- **Trang `/me` không còn nổ overlay `ApiClientError` khi phiên chết giữa chừng.** Khi `me` vẫn nằm trong React state nhưng cookie phiên đã bị thu hồi (vd. vừa đổi mật khẩu ở tab khác → `deleteAllSessions`), 3 lời gọi API trong `useEffect` trả `401`. Trước đây dùng `.then()` không `.catch()` → unhandled rejection → overlay `ログインが必要です`. Giờ gộp vào `Promise.all` trong try/catch; gặp 401 → gọi `refresh()` để đồng bộ về trạng thái đăng xuất (hiện màn "ログインが必要です" + nav đăng xuất). Thêm cờ `cancelled` chống setState sau unmount.

## [0.7.1] — 2026-07-16 — Mở rộng độ phủ unit test cho tầng service

### Kiểm thử
- Thêm test cho 4 service trước đây chưa có unit test (61 → 95 test):
  - **auth-service** (16 test): các thuộc tính bảo mật — quên mật khẩu *luôn* im lặng thành công (không lộ email nào tồn tại), token verify/reset sai/hết hạn → `400 INVALID_TOKEN`, reset mật khẩu thu hồi mọi phiên, mật khẩu lưu dạng hash (không plaintext), give-to-get gate `canViewPrices`, cờ `emailVerified`/`termsAccepted` (version cũ → phải re-accept).
  - **listing-service** (11 test): khớp condition với loại sản phẩm (BOX ⟷ thẻ lẻ → `400 CONDITION_MISMATCH`), station trim rỗng thành null, guard hủy tin (không phải chủ, đang giao dịch, đã kết thúc).
  - **report-service** (4 test): guard tự tố cáo, mục tiêu không tồn tại, `listingId` mặc định null.
  - **comment-service** (4 test): 404 khi listing không tồn tại (đọc & viết), map DTO.
- Không đổi code sản phẩm — chỉ bổ sung test. `tsc --noEmit` sạch.

## [0.7.0] — 2026-07-16 — Tìm kiếm, điều hướng, số lượng, thông báo chưa đọc + gia cố nền tảng

### Tính năng
- **Thanh tìm kiếm sản phẩm** ở trang chủ: tìm listing theo tên thẻ (JP/EN)/set/số thẻ (`GET /api/listings?q=`), debounce 350ms. Trạng thái tìm kiếm + bộ lọc game/category đưa lên URL (`?q=&game=&category=`) → nút back giữ nguyên kết quả, link đã lọc chia sẻ/bookmark được.
- **Nút quay lại dùng chung** (`components/back-bar.tsx` trong layout): mọi trang tự có, trừ trang chủ. `router.back()`, fallback `/`.
- **Số lượng (quantity)** trên tin đăng: cột `listings.quantity` (1–99, mặc định 1); form đăng bán + dòng chi tiết + badge ×N ở thẻ. **Chỉ là thông tin** — luồng trade giữ nguyên (chưa trừ tồn từng đơn).
- **Huy hiệu đỏ đếm tin chưa đọc** trên nav Chat: `conversations.buyer/seller_last_read_at`; `GET /api/conversations/unread-count`, `POST /api/conversations/:id/read`. Hội thoại vừa match (chưa mở) tính tối thiểu 1. Nav poll 15s + refetch khi focus/đổi route/sự kiện `deal:unread`.

### Gia cố nền tảng
- **Chống race condition trade**: partial unique index `trades_one_active_per_listing` (WHERE status != cancelled) ép ở DB; service bắt lỗi P2002 → `409 TRADE_EXISTS`. Trước đây chỉ check ở tầng service (check-then-insert có race window → có thể 2 trade/1 listing → bẩn dữ liệu giá).
- **Chuẩn bị chịu tải (đợt 1)**: index `(status, created_at)` cho query trang chủ; throttle lazy auto-close 1 lần/phút/process (thay vì mỗi request); chat polling 4s→6s + chỉ poll khi tab hiển thị.

### Kiểm thử
- 61 unit test pass (thêm test cho race, throttle, quantity, unread). Verify browser cho từng tính năng.

## [0.6.1] — 2026-07-14 — Tên ga (最寄り駅) trên tin đăng

- Form đăng bán thêm trường **📍 最寄り駅** (tùy chọn, ≤50 ký tự) — người mua biết khu vực người bán để hẹn giao dịch trực tiếp (手渡し).
- Hiển thị ở thẻ sản phẩm trang chủ + trang chi tiết; cột `listings.station`; đủ 3 ngôn ngữ.
- E2E: tạo/đọc listing kèm ga OK, quá 50 ký tự bị chặn 400.

## [0.6.0] — 2026-07-14 — Logo mới + đa ngôn ngữ (日本語/Tiếng Việt/English)

### Đã làm
- **Logo mới** (`public/logo.jpg`, đã crop viền trắng): thay chữ "DEAL" trong navbar bằng logo ngựa xanh-vàng "DEAL SMART • WIN TOGETHER".
- **i18n 3 ngôn ngữ**: hệ thống tự viết gọn (`src/lib/i18n.tsx` + từ điển ~170 khóa `src/lib/messages.ts`); nút chuyển 🇯🇵/🇻🇳/🇬🇧 ở góc phải navbar, lựa chọn lưu localStorage. Toàn bộ UI dịch: trang chủ, auth, đăng tin, chi tiết, chat, trade, rating, giá, trang cá nhân, banner, modal điều khoản.
- Ngoại lệ có chủ đích: `/terms` `/privacy` giữ nguyên tiếng Nhật (bản pháp lý gốc); thông báo lỗi từ server (zod/ApiError) vẫn tiếng Nhật; tên thẻ trong catalog là dữ liệu nên giữ nguyên.
- `labels.ts` rút gọn còn formatter + key list; nhãn hiển thị chuyển hết vào messages.ts.

- **Fix theo phản hồi**: logo phóng to (navbar h-16, logo h-12 ≈ 131×48px); nạp font **Noto Sans** (subset `vietnamese` + `latin`) qua next/font làm font chính, chữ Nhật fallback về Hiragino/Yu Gothic/Meiryo — hết lỗi phông khi hiển thị tiếng Việt có dấu trên Windows.

### Kiểm thử
- 49 unit test pass, production build sạch; verify UI: chuyển cả 3 thứ tiếng trên trang chủ, logo hiển thị đúng ở navbar; glyph dấu tiếng Việt xác nhận có trong font đã nạp.

## [0.5.0] — 2026-07-14 — Phase 5: 利用規約・プライバシーポリシー + đồng ý bắt buộc

### Đã làm
- Trang `/terms` — 利用規約 10 điều bảo vệ vận hành viên: DEAL chỉ cung cấp "nơi" kết nối, không phải bên mua/bán, không escrow; tranh chấp do 2 bên tự giải quyết; cấm hàng giả/đa tài khoản/thao túng giá; user đồng ý cho công khai dữ liệu giá ẩn danh; miễn trách; luật Nhật. Trang `/privacy` — thu thập gì, dùng làm gì, không bán cho bên thứ 3, quyền yêu cầu xóa.
- **Đồng ý bắt buộc 2 tầng**: (1) đăng ký phải tick checkbox (server ép, 400 nếu thiếu); (2) user cũ/khi điều khoản đổi version → modal chặn toàn màn hình sau đăng nhập, server chặn kép `403 TERMS_NOT_ACCEPTED` ở mọi hành động ghi.
- Versioning: đổi `TERMS_VERSION` trong `src/lib/terms.ts` là toàn bộ user phải đồng ý lại.
- ⚠️ Nội dung chính sách là bản mẫu soạn theo thông lệ — nên nhờ luật sư rà trước khi vận hành thương mại thật.

### Kiểm thử
- 49 unit test — pass. E2E: đăng ký thiếu tick → 400; user cũ bị chặn 403 → đồng ý → dùng được; /terms /privacy public — pass.

## [0.4.1] — 2026-07-14 — SMTP Gmail thật đã hoạt động

- Cấu hình SMTP Gmail (App Password) trong `.env` local — **email xác nhận/đặt lại mật khẩu giờ gửi vào hộp thư thật**, đã test thành công (`[mail] sent to ...`). Hộp thư dev `/dev/mailbox` tự vô hiệu khi có SMTP.
- Đang gửi từ Gmail cá nhân; muốn đổi sang Gmail dự án: bật 2FA cho tài khoản đó → tạo App Password → thay `SMTP_USER`/`SMTP_PASS` trong `.env` (xem README). Lưu ý: App Password chỉ dùng được với đúng tài khoản đã tạo ra nó.
- `.env` chứa credential, đã nằm trong `.gitignore` — không bao giờ commit.

## [0.4.0] — 2026-07-13 — Phase 4: Xác nhận email + Quên mật khẩu

### Đã làm
- **Xác nhận email khi đăng ký**: mail chứa link `/verify?token=` (hạn 24h, dùng 1 lần); chưa xác nhận vẫn đăng nhập/xem được nhưng **mọi hành động ghi bị chặn** (`403 EMAIL_NOT_VERIFIED`); banner nhắc + nút gửi lại trên toàn site. `users.email_verified_at`, bảng `email_tokens`.
- **Quên mật khẩu**: trang `/forgot-password` (link ngay dưới ô mật khẩu ở trang login) → mail chứa link `/reset-password?token=` (hạn 1h) → đổi mật khẩu → **thu hồi toàn bộ session** (đăng xuất mọi thiết bị). Endpoint forgot luôn trả ok — không lộ email nào tồn tại.
- **Hạ tầng mail**: nodemailer; có `SMTP_*` trong `.env` → gửi thật (hướng dẫn Gmail App Password trong `.env.example`); chưa có → **hộp thư dev `/dev/mailbox`** để test toàn bộ luồng local (tự vô hiệu ở production).
- Seed users được set verified sẵn — demo accounts không bị chặn.

### Kiểm thử
- 48 unit test — pass. 21 check E2E Phase 4 (chặn 403 trước verify, token one-time, hết hạn, forgot không lộ thông tin, reset thu hồi session, login mật khẩu cũ/mới) — pass.
- UI verify qua browser: đăng ký → banner → dev mailbox → bấm link → verified.

## [0.3.0] — 2026-07-13 — Phase 3: BOX, bình luận công khai, luồng mua mới

### Đã làm
- **BOX thẻ (sealed)**: `cards.category` (`single|box`), 8 box seed (151, VSTARユニバース, ROMANCE DAWN...); condition riêng `BOX_SHRINK`/`BOX_NO_SHRINK`, server ép condition khớp category (`400 CONDITION_MISMATCH`); tab lọc シングル/BOX ở trang chủ; form đăng tin có chọn loại; dữ liệu giá box dùng chung pipeline.
- **Bình luận công khai** dưới mỗi listing: ai cũng đọc, đăng nhập mới viết (1–500 ký tự). Bảng `comments`.
- **Luồng mua mới — thay thế chat trực tiếp**: buyer bấm 購入希望 → seller thấy danh sách người muốn mua kèm ★ uy tín → seller bấm 連携する với người mình chọn → sinh conversation riêng → chat/trade như cũ. Bảng `purchase_requests` (unique listing+buyer, `pending|connected`); `POST /api/conversations` bị gỡ — conversation chỉ sinh qua connect.
- Sửa hạ tầng dev: phát hiện lỗi 500 ngẫu nhiên do dự án nằm trong thư mục OneDrive (OneDrive khóa file `.next` khi sync) — xem README mục Troubleshooting.

### Kiểm thử
- 48 unit test (8 test mới cho request-service) — pass.
- 25 check E2E Phase 3 (BOX validation, comment permission, toàn bộ luồng 購入希望→連携→chat→trade, quyền riêng tư 403) — pass.
- UI verify qua browser: tab BOX, trang chi tiết mới với comment + purchase panel.

## [0.2.0] — 2026-07-11 — Phase 2: Uy tín & chống thao túng giá

### Đã làm
- **Rating blind-mutual**: đánh giá 1–5★ + comment sau khi trade chốt, mỗi bên 1 lần; **ẩn cho đến khi cả 2 đã rate** (chống trả đũa). Bảng `ratings`, API `POST/GET /api/trades/:id/rating`, form ★ trong trade panel.
- **Flag giá bất thường**: price_record lệch >50% median (≥3 mẫu nền chưa-flag cùng card+condition) → `flagged=true`; vẫn hiển thị kèm ⚠ nhưng loại khỏi stats & chart (chống thông đồng bơm/dìm giá). Trade không bị chặn — chỉ gắn nhãn dữ liệu.
- **Report user**: nút 通報 trên trang listing, bảng `reports` (lý do 10–500 ký tự, chặn tự report). MVP chỉ lưu.
- **Badge uy tín**: `GET /api/users/:id/summary` — ★ trung bình (chỉ từ rating đã reveal) + số lần được đánh giá + số giao dịch đã chốt; hiển thị trên listing detail và マイページ.
- Sửa 3 bug phát hiện khi demo: lộ giá đã khai cho bên xác nhận (UI + API), chat polling append trùng tin nhắn, duplicate React key ở chart.

### Kiểm thử
- 40 unit test (12 test mới cho rating/outlier) — pass.
- 18 check E2E Phase 2 qua API thật (blind/reveal, outlier flag, report) — pass.
- UI verify qua browser: rate 2 chiều → reveal, badge ★ trên listing.

### Chưa làm (cần tài khoản ngoài)
LINE Login · SMS OTP · push/email notification · Pokémon TCG API · deploy Vercel.

## [0.1.0] — 2026-07-11 — MVP đầu tiên

Xây dựng toàn bộ core loop theo `design.md` (đã được duyệt):

### Đã làm
- **Scaffold**: Next.js 15 + TypeScript + Prisma/SQLite + Tailwind 4 + Vitest.
- **Database**: 8 bảng (users, sessions, cards, listings, conversations, messages, trades, price_records); `price_records` ẩn danh từ tầng schema (không cột user). Seed: 5 users, 38 thẻ Pokémon/One Piece, 10 listing active, 66 price records.
- **Auth**: register/login/logout/me, session cookie httpOnly (30 ngày), bcrypt.
- **Catalog**: search/autocomplete thẻ chuẩn hóa (set, số thẻ, ngôn ngữ, rarity) — không cho gõ tên tự do.
- **Listings**: tạo (condition bắt buộc + upload ảnh thật ≤5MB) / xem / hủy; filter game/card/status/mine.
- **Chat**: conversation theo (listing, buyer), tin nhắn polling 4s, incremental qua `?after=`.
- **Trades**: khởi tạo từ conversation kèm giá đóng → bên kia xác nhận (giá phải khớp — chống khai láo `PRICE_MISMATCH`) → `confirmed`; quá 7 ngày im lặng tự chốt `self_reported` (lazy-check). Hủy được khi pending.
- **Price data**: lưu giá NGAY khi trade chốt (tách hoàn toàn khỏi rating — chưa có rating trong MVP, đúng thiết kế chống selection bias); trang giá có chart SVG + bảng + stats (count/median/min/max), filter theo condition; gate **give-to-get** với teaser số record.
- **UI tiếng Nhật**: trang chủ (browse + filter game), đăng nhập/đăng ký, đăng tin, chi tiết listing, chat + panel xác nhận giao dịch, trang giá (kèm màn hình khóa), trang cá nhân.

### Kiểm thử
- 28 unit test (vitest) cho business rules tầng service — pass.
- 25 check E2E qua API thật (2 user đi hết core loop + các case biên 401/403/409) — pass.
- Build production sạch, UI smoke test qua browser.

### Chưa làm (V2 theo design.md)
Rating blind-mutual · LINE Login · SMS OTP · push notification nhắc xác nhận · flag giá bất thường · Pokémon TCG API · cloud storage ảnh · AI dự đoán giá.

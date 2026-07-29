# CHANGELOG

## [0.24.0] — 2026-07-30 — Bình luận công khai trên tin Đăng mua

### Tính năng
- **Tin đăng mua giờ có khu bình luận công khai** như tin bán — mọi người hỏi đáp **trước** khi chào bán hoặc kết nối (theo yêu cầu chủ web). Ai cũng đọc được; viết thì cần đăng nhập + đã xác nhận email, giống hệt bình luận tin bán.
- Chủ tin đăng mua nhận **push** khi có bình luận mới (bỏ qua khi tự bình luận), và bình luận vào **mục 🔔 hoạt động** ở trang cá nhân.

### Kỹ thuật
- Bảng `comments` mở rộng theo đúng lối bảng `favorites`: `listing_id` nới thành **nullable**, thêm `buy_order_id` nullable + index + FK cascade, **đúng 1 trong 2 khác null** (enforce ở service). Migration `20260730004018_comments_on_buy_orders` — chỉ thêm cột + nới NOT NULL, **không mất dữ liệu, không cần backfill** (hàng cũ giữ `listing_id`). Đã deploy Tokyo.
- Repo/service/route/api-client/UI đều nhận `CommentTarget = {kind:"listing"|"buy_order", id}` thay vì `listingId` trần → một đường code cho cả hai loại tin, không nhân bản. `CommentTarget` để ở `src/lib/comment-target.ts` (module trung lập, không `"use client"` — cùng bài học v0.23.0). Route mới `/api/buy-orders/:id/comments` đối xứng với route tin bán. `CommentsSection` dùng chung.
- Chủ tin đăng mua là **`buyer_id`** (luồng đảo chiều) — push và quyền phải bám field này, không phải `sellerId`. Có test riêng cho chỗ dễ nhầm này.
- **Bẫy chặn được trước khi lên production:** `/me` đang dựng link thông báo bằng `kind === "offer" ? /buy-orders/ : /listings/`. Thêm bình luận trên tin đăng mua thì `kind === "comment"` thuộc **cả hai** loại tin → link sẽ thành `/listings/<buyOrderId>` và ra **404**. Đã thêm `ActivityItemDto.targetKind` làm nguồn sự thật cho việc dựng link, thay vì suy từ `kind`.
- Activity (danh sách + `countNewActivity` cho badge) giờ gồm bình luận trên **cả** tin bán lẫn tin đăng mua của mình, vẫn giữ bộ lọc "tin còn sống" của v0.22.1.
- +5 unit test (**248 pass**), tsc + `next build` sạch. Verify trên DB production (tạo → đọc → kiểm thông báo → **xoá sạch**): bình luận vào đúng `buy_order_id`, hiện trong thông báo của chủ tin với `targetKind: "buy_order"`, **link dựng ra `/buy-orders/<id>` đúng**. API: GET công khai 200, POST chưa đăng nhập 401, tin không tồn tại 404.

## [0.23.0] — 2026-07-30 — Đổi tên "Đăng mua" + gộp tin đăng mua vào trang tìm kiếm

### Thay đổi
- **Đổi tên toàn bộ "tin gom số lượng lớn / まとめ買い" → "Đăng mua"** (19 chuỗi UI, vi + en). Menu "Gom số lượng" → **"Đăng mua"** và giờ trỏ thẳng vào form đăng tin (`/buy-orders/new`) — **cân xứng với "Đăng bán"**; trước đây nó trỏ vào trang danh sách nên 2 mục cạnh nhau hành xử khác hẳn nhau.
- **Tin đăng mua giờ nằm CHUNG trang tìm kiếm với tin bán** (theo yêu cầu chủ web). Mặc định thấy cả hai, trộn theo một dòng thời gian mới-nhất-trước; thêm hàng tab **"Tất cả / Đang bán / Đăng mua"** để lọc, đồng bộ lên URL (`?type=buy`) nên link chia sẻ và nút back đều giữ đúng bộ lọc. Ô tìm kiếm + lọc game/loại giờ áp cho **cả hai** nguồn — tìm "Thịt bò" ra được cả tin đăng mua, thứ trước đây bị giấu ở trang riêng.
- **Trang `/buy-orders` riêng đã bỏ**, thay bằng redirect 307 sang `/?type=buy` (giữ nguyên `q`/`game`/`category`) — link đã chia sẻ, bookmark và lịch sử trình duyệt của user vẫn chạy, không trả 404.

### Kỹ thuật
- `BuyOrderCard` dựng lại theo đúng khung `ListingCard` (khối ảnh 3/4 + khối chữ) để 2 loại thẻ đứng chung lưới không so le; phân biệt bằng viền/nhãn hổ phách "Đăng mua" + badge "Cần {n} bản", không phải bằng kích thước. Tin đăng mua không có ảnh (ảnh là tùy chọn) → khối giữ chỗ, không để sập chiều cao.
- Tab "Tất cả" gọi song song 2 endpoint rồi trộn ở client, **cố ý KHÔNG gộp thành 1 endpoint SQL**: listing và buy_order là 2 bảng khác nhau, gộp ở tầng SQL kéo theo phân trang chung phức tạp mà bảng tin hiện chưa hề phân trang.
- `BoardType`/`parseBoardType`/`boardKey` đặt ở `src/lib/board.ts` — module **trung lập**, không `"use client"`.
- **Bug bắt được lúc verify:** ban đầu để `boardKey` trong `home-board.tsx` (`"use client"`) rồi gọi từ `page.tsx` (server component) → runtime ném `Attempted to call boardKey() from the server`, bị `catch` của SSR nuốt → `initial = null` → **SSR trang chủ chết âm thầm**, trang vẫn đầy đủ tin nhờ client fetch nên nhìn ngoài y hệt lúc chạy tốt. `tsc` KHÔNG bắt được. Đã sửa + thêm `console.error` vào nhánh catch để lần sau lộ ra ngay thay vì im lặng.
- Verify: SSR trả đúng tập cho `/`, `?type=sell`, `?type=buy` và param rác (`?type=xxx` → hiện cả hai); bộ lọc `game`/`category`/`q` đúng trên cả 2 nguồn; bấm tab lọc + đồng bộ URL đúng; redirect `/buy-orders` giữ bộ lọc; tab mới **0 lỗi console**. 243 test pass, tsc + `next build` sạch. Không migration, không đổi API.

## [0.22.1] — 2026-07-29 — Sửa lỗi: thông báo trên tin đã bán vẫn hiện mãi

### Sửa lỗi
- **Mục 🔔 Hoạt động ở trang cá nhân hiện thông báo về tin đã giao dịch xong, không bao giờ mất.** User báo trên tài khoản `Hieu`: tin BOX "Hiroshima" đã bán (`closed`) mà bình luận trên đó vẫn nằm trong danh sách thông báo.
- **Gốc:** 3 truy vấn trong `repositories/activity.ts` chỉ lọc theo *chủ tin* và trạng thái của **bình luận/yêu cầu**, KHÔNG hề xét trạng thái của **tin đăng**. Tin `closed`/`cancelled` vẫn kéo theo bình luận + 購入希望 pending cũ hiện vĩnh viễn. Badge đỏ ở nav thì có lọc `createdAt > activitySeenAt` nên tự tắt — chỉ danh sách là kẹt lại, nên lỗi trông như "thông báo ma".
- **Sửa:** cả 3 truy vấn (+ `countNewActivity` để badge đếm đúng cùng tập với danh sách, tránh badge "1" mà mở ra rỗng) giờ loại tin đã kết thúc. Dùng `status: { notIn: ["closed","cancelled"] }` **chứ không phải `status: "active"`**: `in_trade` là trạng thái legacy (không còn set từ v0.19.0) nhưng nếu còn bản ghi cũ thì đó vẫn là việc đang diễn ra, phải hiện — kiểm chứng trên DB thật thấy đúng 2 bình luận trên tin `in_trade` của `Ninh` sẽ bị mất oan nếu lọc bằng `"active"`.
- Không migration, không đổi API. Verify trên DB production (chỉ đọc): trước sửa Hieu có 1 mục ma, sau sửa còn 0 và badge khớp danh sách; đối chiếu toàn bộ 3 bình luận trong DB — chỉ đúng mục trên tin `closed` bị ẩn. 243 test pass, tsc sạch.

## [0.22.0] — 2026-07-29 — Thông báo đẩy lên màn hình điện thoại (Web Push + PWA)

### Tính năng
- **Thông báo hiện thẳng trên màn hình điện thoại kể cả khi không mở web.** Mục "🔔 Thông báo trên điện thoại" ở trang cá nhân để bật/tắt — cài đặt áp dụng cho **riêng thiết bị đang dùng** (1 người nhiều máy thì bật từng máy).
- Có push cho **3 nhóm sự kiện** (chủ web chọn, cố ý không phủ hết để tránh làm phiền): tin nhắn chat mới → bên còn lại; 購入希望 → chủ tin đăng; chào bán tin gom → chủ tin gom; bình luận vào tin → chủ tin (bỏ qua khi tự bình luận). Bấm vào thông báo mở thẳng đúng trang. **Chốt giá / nhắc đánh giá chưa có push.**
- **Web giờ cài được ra màn hình chính (PWA)**: manifest + bộ icon (192/512/maskable/apple-touch, cắt từ logo ngựa). Trên Android là tiện thêm; trên **iPhone là BẮT BUỘC** — Apple chỉ cho phép thông báo khi web đã được "Thêm vào MH chính" (iOS 16.4+), trong tab Safari thường thì `PushManager` không tồn tại. UI nhận diện ca này và hiện hướng dẫn cài từng bước thay vì một cái nút bấm không ăn.

### Kỹ thuật
- Bảng mới `push_subscriptions` (**1 bản ghi = 1 THIẾT BỊ**, không phải 1 user), `endpoint` unique làm key upsert. Migration `20260729211327_push_subscriptions` (additive) **đã deploy Tokyo**. Client gửi lại subscription mỗi lần mount để "nhận lại" endpoint về tài khoản đang đăng nhập → xử lý ca đổi tài khoản trên cùng máy.
- Đường đi: `push-subscriptions.ts` (repo) → `push-service.ts` → `GET /api/push/public-key`, `POST/DELETE /api/push/subscribe` → `PushToggle` + `public/sw.js`. Thư viện `web-push`, xác thực VAPID.
- **Bất biến mới: push không bao giờ được làm hỏng hành động chính.** `notify()` nhận **hàm dựng payload** chứ không phải object — nội dung thông báo đọc field lồng nhau (`listing.card.nameJa`), nếu dựng payload ném lỗi ngay tại điểm gọi thì cả việc gửi tin nhắn sập theo. (Chính test bắt được lỗi này trước khi lên production.) Mọi lỗi gửi đều nuốt + log, không `await`.
- Endpoint trả 404/410 (gỡ app) → **tự xoá bản ghi**; lỗi 5xx thì giữ lại (có thể tạm thời). `tag` gộp theo nguồn để 10 tin nhắn liên tiếp chỉ hiện 1 dòng.
- **Thiếu khoá VAPID → tính năng tự tắt êm** (`/api/push/public-key` trả `null`, UI ẩn mục, server không gửi gì), web chạy bình thường — quan trọng cho môi trường dev chưa sinh khoá.
- `sw.js` **chỉ phục vụ push, KHÔNG cache** (tránh sinh trạng thái cũ khó gỡ, web đã dựa vào SSR/ISR của Next). CSP nới `worker-src`/`manifest-src`. Layout khai thêm tay `apple-mobile-web-app-capable` — Next 15 chỉ phát thẻ chuẩn mới `mobile-web-app-capable`, iOS đời cũ không đọc.
- +14 unit test — **243 pass**, tsc sạch, `next build` sạch, `npm audit` 0 vuln. Verify browser: manifest/sw/icon/API đều 200, service worker đăng ký được (CSP không chặn), endpoint đúng 401 khi chưa đăng nhập, cặp VAPID ký JWT hợp lệ. **Round-trip thật tới điện thoại chưa verify được** — môi trường tự động luôn từ chối quyền thông báo; cần thử trên iPhone thật. Docs mới `docs/push.md`.
- Env `VAPID_*` đã set trên Vercel (Production + Preview). Lưu ý: `vercel env pull` trả `[SENSITIVE]` cho **mọi** biến do người dùng đặt (kể cả `DATABASE_URL` đang chạy tốt) → **không dùng pull để kiểm chứng giá trị**; cách đúng là gọi `/api/push/public-key` trên production so với `.env` local (public key không phải bí mật).

## [0.21.2] — 2026-07-24 — Vá bảo mật: nâng Next.js 15.5.20 → 15.5.21

### Bảo mật
- GitHub/Dependabot báo **8 advisory (3 high, 5 moderate)** gom trong 1 lỗ hổng `next` (DoS App Router/Image Optimization SVG, SSRF Server Actions/rewrites, cache confusion, lộ endpoint Server Function…). Vá bằng `npm audit fix` (KHÔNG `--force`, không breaking) → `next@15.5.21` (chỉ đổi `package-lock.json`, range `^15.3.4` giữ nguyên). `npm audit` giờ **0 vulnerabilities**.
- Verify: `tsc` sạch, **229 test pass**, `next build` thành công (exit 0). Không đổi code app, không migration.

## [0.21.1] — 2026-07-24 — Sửa lỗi: bên đối phương không xác nhận chốt giá được

### Sửa lỗi
- **Bên đối phương không nhấn "Xác nhận chốt giá" được sau khi bên kia đã báo chốt.** Gốc: trang chat chỉ reload danh sách hội thoại lúc mở trang / sau hành động của chính mình; `ChatPanel` poll tin nhắn nhưng **trạng thái trade không được poll**, và việc tạo trade không sinh tin nhắn. Nên khi A tạo trade, `conversation.activeTradeId` của B không cập nhật → B vẫn thấy form "Báo chốt giá" (tạo mới), bấm vào bị `TRADE_EXISTS` (409). Kéo theo: trade không bao giờ chốt → **banner "Bắt buộc đánh giá" (vốn chỉ hiện sau khi trade chốt) cũng không xuất hiện** → tưởng đánh giá không bắt buộc.
- **Sửa:** `TradePanel` giờ lấy trạng thái trade **theo `conversation.id`** (endpoint mới `GET /api/conversations/:id/active-trade`) và **poll mỗi 6s** (chỉ khi tab hiển thị + trade chưa chốt), thay vì dựa vào `conversation.activeTradeId` tĩnh. Hai bên thấy nhau tạo/xác nhận/hủy gần realtime; sau khi chốt, banner đánh giá bắt buộc hiện đúng cho cả 2 bên. Mức ép đánh giá giữ nguyên (nhắc dai trong khung trade + không đóng được tin cho tới khi đánh giá — không chặn toàn web, theo quyết định chủ web).
- Kỹ thuật: repo `findActiveTradeByConversation`, service `getActiveForConversation` (membership check, read thuần), `api.getActiveTrade`. Không migration. +3 unit test — **229 pass**, tsc sạch. Verify: build sạch, endpoint 401 khi chưa đăng nhập (luồng 2 bên đã phủ unit test; E2E 2 tài khoản đăng nhập không mô phỏng được trong môi trường verify).

## [0.21.0] — 2026-07-24 — Giá tham khảo thị trường (nguồn ngoài) trên trang giá sản phẩm

### Tính năng
- **Khu "Giá tham khảo thị trường" trên trang `/prices/:cardId`** — hiển thị giá chủ web tự thu thập từ nguồn NGOÀI platform (đầu tiên: sản phẩm One Piece "Round One", 8 điểm giá 23–24/7, 115 pack). Mục đích: tạo mặt bằng giá cho người mới xem khi web còn ít giao dịch thật → xây niềm tin, mà **không giả làm giao dịch trên DEAL**. Khu này viền teal, có nhãn nguồn + disclaimer rõ ("KHÔNG phải giao dịch trên DEAL"), gồm 4 stat tile (TB có trọng số theo số lượng / thấp nhất / cao nhất / số lần ghi nhận), biểu đồ đường và bảng chi tiết (thời điểm JST · số lượng pack · đơn giá).
- **Công khai, KHÔNG gate give-to-get, KHÔNG cần đăng nhập**: khách chưa đăng ký cũng thấy được giá tham khảo (đúng mục tiêu tạo niềm tin), trong khi phần giá-giao-dịch-thật bên dưới vẫn khóa give-to-get như cũ. Trang trả kèm `card` từ endpoint tham khảo nên header + khu tham khảo hiện được ngay cả khi phần trade đang khóa.

### Kỹ thuật
- Bảng mới `reference_prices` (`ReferencePrice`), **TÁCH HẲN `price_records`** (giao dịch P2P thật, ẩn danh, gắn tradeId) — nguồn ngoài không được coi là dữ liệu đóng cho AI dự đoán giá. Migration `20260724150140_reference_prices` (additive) đã deploy Tokyo. Unique `(card_id, source, recorded_at)` để seed idempotent.
- Đường đọc repo→service→route→DTO: `referencePrices.ts` → `reference-price-service.ts` (`weightedAverage` có trọng số theo số lượng) → `GET /api/reference-prices/:cardId` (public, cache như catalog) → `ReferencePriceDto`/`ReferencePriceStatsDto` → `api.getReferencePrices`. Chart riêng `reference-price-chart.tsx`.
- Nhập/cập nhật dữ liệu: `npm run db:seed-reference-prices` (idempotent, chỉ chủ web chạy — không có admin UI, giống VIP/report). i18n `refprice.*` (vi/en). +6 unit test `weightedAverage` — **226 pass**, tsc sạch. Verify browser: khu tham khảo render đúng cho khách chưa đăng nhập, 0 lỗi console, phần trade vẫn khóa. Docs api/prices + data-model cập nhật.

## [0.20.0] — 2026-07-22 — Nút "Đã bán · đóng tin" cho chủ tin đăng

### Tính năng
- **Chủ tin đăng có nút "Đã bán · đóng tin"** (xanh lá, nút chính) ở trang chi tiết, cạnh nút "Gỡ tin đăng" (nay thành nút phụ). Đặt tin sang `closed` (khác `cancelled` = gỡ vì không bán) — hữu ích khi bán offline hoặc muốn đóng gọn sau khi giao dịch xong mà đối phương chưa đánh giá (bổ trợ cho mốc auto-đóng-khi-đánh-giá ở v0.19.0). Có `window.confirm` vì đóng tin không hoàn tác được. Badge trạng thái hiện sẵn "Đã bán" cho `closed`.
- Kỹ thuật: mở rộng union `patchListingSchema` → `status ∈ {cancelled, closed}`; tách guard chung `assertOwnerCanEnd` (chỉ chủ tin, chỉ khi active, chặn khi có trade **pending**) dùng cho cả `cancel` và `markSold` mới; route PATCH phân nhánh theo `status`; `api.markListingSold`. Không migration. +4 unit test markSold — **220 pass**, tsc sạch. Verify: trang chi tiết render sạch 0 lỗi console (xem nút chủ tin cần đăng nhập đúng chủ — kỹ thuật set cookie phiên tạm bị chặn nên chưa chụp được, guard đã phủ bằng unit test).

## [0.19.0] — 2026-07-22 — Tin bán giữ active suốt trade, chỉ đóng sau khi đánh giá

### Thay đổi lớn (theo quyết định chủ web)
- **Tin bán thường KHÔNG còn biến mất khi có người chốt giá.** Trước: tạo trade → listing `in_trade` (ẩn khỏi bảng + chặn 購入希望 mới), chốt → `closed`. Giờ: tin **giữ `active` suốt quá trình thương lượng/chốt giá** để vẫn hiện trên bảng và người khác vẫn gửi 購入希望 được (người bán kết nối được nhiều người). Tin chỉ `closed` khi **giao dịch chốt giá XONG *và* cả 2 đã đánh giá** — mốc đóng duy nhất, đặt ở rating thứ 2 trong `rating-service` (`closeListingIfActive`, chỉ đụng tin đang active nên không ghi đè tin đã hủy).
- Ràng buộc **"1 trade chưa-cancelled / listing"** không đổi — vẫn do partial unique index `trades_one_active_per_listing` đảm bảo (không còn phụ thuộc trạng thái listing). `in_trade` thành trạng thái **legacy** (không còn set; giữ trong enum cho dữ liệu cũ).
- `createTrade` / `closeTrade` / `cancelTrade` không đụng trạng thái listing nữa (bỏ 3 transition + gộp bớt `$transaction`). Guard hủy tin dùng `findPendingTradeByListing` (chặn khi có trade **pending**) thay cho check `in_trade`; trade đã chốt chờ đánh giá thì vẫn hủy tin được.
- Không cần migration (chỉ đổi logic + ngữ nghĩa trạng thái). +3 unit test (đóng tin ở rating thứ 2 với trade listing; không đóng với buy-order/không listing; không đóng ở rating đầu), sửa test guard hủy tin + cancelTrade 1 tham số — **216 pass**, tsc sạch. Docs business-rules #9/#9b + data-model + api/listings + api/trades cập nhật.

## [0.18.0] — 2026-07-22 — Ảnh minh họa cho tin gom số lượng lớn

### Tính năng
- **Tin gom (まとめ買い) thêm được ảnh minh họa** (tùy chọn): ô upload ở form đăng tin gom, tái dùng luồng `/api/uploads` + Supabase Storage như tin bán. Ảnh mẫu thẻ/BOX muốn gom giúp người bán nhận ra đúng món. Có preview + nút bỏ ảnh; để trống vẫn đăng được (khác tin bán — ảnh bắt buộc).
- Hiển thị: ảnh lớn ở trang chi tiết tin gom (`object-contain`, chỉ khi có), thumbnail 4:3 trên thẻ danh sách tin gom.
- Schema: cột `buy_orders.image_url` (nullable), migration `20260722100000_buy_order_image_url` đã deploy Tokyo. Thread qua validation (`isOwnImageUrl` như tin bán) → service → repo → serializer → `BuyOrderDto.imageUrl`. +1 unit test (imageUrl thread xuống repo; mặc định null) — **213 pass**, tsc sạch. Verify: form render đúng ô ảnh (tùy chọn, tiếng Việt), 0 lỗi console. Docs data-model + api/buy-orders cập nhật.

## [0.17.0] — 2026-07-22 — Gỡ tiếng Nhật, chuyển sang Việt (mặc định) + Anh

### Thay đổi lớn
- **Gỡ hoàn toàn tiếng Nhật khỏi UI** (quyết định chủ web). Ngôn ngữ còn lại: 🇻🇳 vi (**mặc định**) + 🇬🇧 en; switcher bỏ 日本語. `Locale = "vi" | "en"`, `messages.ts` mỗi khóa còn `{ vi, en }` (strip 355 field `ja`), i18n default + fallback = vi, `<html lang="vi">`, metadata tiếng Việt.
- **Điều khoản + Chính sách bảo mật dịch sang tiếng Việt** (`/terms`, `/privacy`). `TERMS_VERSION` 1.0 → **2.0 (2026-07-22)** (sync `prisma/seed.ts`) → user hiện tại phải đồng ý lại 1 lần ở lần vào kế tiếp.
- **Toàn bộ lỗi server sang tiếng Việt**: ApiError + zod messages trong ~16 file service/route/validation, `errors.ts` (INTERNAL/UNAUTHORIZED), `session.ts` (EMAIL_NOT_VERIFIED/TERMS_NOT_ACCEPTED), `middleware.ts` (CSRF), mail xác nhận/reset (auth-service), lỗi kết nối api-client, trang `/dev/mailbox`.
- Dấu phân cách `・` (Nhật) → `·` toàn site. Card `nameJa`/`nameEn` GIỮ NGUYÊN (dữ liệu thật của thẻ, không phải UI).
- Verify: tsc sạch, 212 test pass (sửa 1 assert message JP→VI). Browser: mặc định vi + `lang=vi`, switcher chỉ vi/en, đổi en OK, terms/privacy tiếng Việt v2.0, 0 lỗi console. Còn 28 comment `//` lẻ tiếng Nhật (nội bộ, build tự cắt — không tới người dùng). Docs CLAUDE.md/i18n.md cập nhật.

## [0.16.0] — 2026-07-21 — Đánh giá bắt buộc + tự xóa chat sau giao dịch

### Tính năng
- **Đánh giá bắt buộc sau khi chốt giá**: `RatingSection` khi chưa đánh giá → viền hổ phách + banner "必須 / đánh giá là bắt buộc", không có nút bỏ qua. Cơ chế nhắc dai trong chat (không ép được 1 cú click), KHÔNG chặn phần còn lại của web (theo quyết định chủ web).
- **Tự xóa nội dung chat 1 ngày sau khi trade + cả 2 đã đánh giá**: rating THỨ 2 của trade đặt `conversations.messages_purge_at = now + 1 ngày` (idempotent `setMessagesPurgeAt`). Sweep lazy `purgeExpiredChatsThrottled` (throttle 1/phút, gọi trong `listMine` — KHÔNG cron, giống auto-close trade) xóa nội dung `messages`, ghi `messages_purged_at`. **Giữ conversation shell + trade history + price_records** — chỉ nội dung tin nhắn biến mất. `ConversationDto.messagesPurged=true` → UI hiện "このチャットは削除されました", ẩn ô nhập, ngừng poll. Rating không hoàn tất → không đặt hạn → chat không bị xóa.
- Schema: `conversations.messages_purge_at` + `messages_purged_at` (+ index), migration `20260722...` đã deploy. +4 unit test (rating hẹn purge đúng ở rating thứ 2; sweep xóa + throttle) — **212 pass**. Verify E2E trên dev bằng conversation/trade tạm (banner 必須 hiện, 3 tin present → set hạn quá khứ → sweep xóa sạch, conversation+trade còn, UI hiện thông báo, ô nhập ẩn) rồi dọn sạch. Docs chat.md/ratings/data-model + i18n ja/vi/en.

## [0.15.0] — 2026-07-21 — Nút lưu ❤️ + mục "Đã lưu" ở trang cá nhân

### Tính năng
- **Nút ❤️ lưu/bỏ lưu** trên thẻ tin bán + tin gom (overlay góc thẻ) và trang chi tiết (nút inline cạnh giá — chỉ hiện với người không phải chủ tin). Chưa đăng nhập → bấm chuyển sang /login (không lưu ẩn danh).
- **Mục "❤️ 保存した出品 / Đã lưu"** đầu trang cá nhân: thumbnail + tên + giá, bấm đi thẳng tới tin. Tin đã bán/gỡ/hủy (status != active) hoặc bị xóa → mờ đi + "この出品はもうありません / Sản phẩm này không còn", vẫn cho bỏ lưu để dọn.
- **Không spam request**: `FavoritesProvider` tải tập id đã lưu 1 lần khi đăng nhập (`GET /api/favorites/ids`), mọi `HeartButton` tra cứu + toggle optimistic (revert nếu API lỗi) — thẻ nào cũng đúng trạng thái tim mà chỉ 1 request/trang.
- Schema: bảng `favorites` (user + listing?/buy_order?, 2 unique chặn trùng, cascade), migration `20260722...` đã deploy. Repo/service/validation + endpoint `GET/POST /api/favorites`, `GET /api/favorites/ids`. +8 unit test (208 pass). Docs favorites.md + data-model + README, i18n ja/vi/en.

## [0.14.0] — 2026-07-21 — Thông báo hoạt động trên tin của mình

### Tính năng
- **Mục "お知らせ" ở trang cá nhân** (`/me`): gộp 3 loại hoạt động trên tin của mình, mới nhất trước — bình luận của người khác (💬, 20 gần nhất), 購入希望 đang chờ (🛒), chào bán đang chờ trên tin gom (📦). Mỗi dòng: người gửi (kèm VIP badge), tên thẻ, nội dung/số lượng, thời gian, link thẳng tới tin; item mới highlight + chấm đỏ.
- **Badge đỏ ở nav trên tên mình** (desktop + mobile menu + chấm đỏ hamburger): số hoạt động mới hơn mốc "đã xem". Mở trang cá nhân → `POST /api/activity/read` ghi mốc → badge về 0 (danh sách giữ nguyên — request/offer pending nằm đó tới khi 連携). Semantics giống hệt unread chat.
- **Không tốn thêm request poll**: `activityCount` gộp vào response `GET /api/conversations/unread-count` sẵn có (giữ thành quả tối ưu 0.13.1). Đếm bằng 3 câu `count` gọn.
- Schema: cột `users.activity_seen_at` (nullable, migration `20260721131543` đã deploy). Endpoint mới `GET /api/activity` + `POST /api/activity/read`. Derived hoàn toàn — không có bảng notification (cùng triết lý trust system).
- +5 unit test activity-service (202 test); docs: chat.md (endpoint + unread-count mới), data-model.md, README map, i18n đủ ja/vi/en.

## [0.13.2] — 2026-07-21 — Trần đăng ký 500 tài khoản/ngày

### Tính năng
- **Trần đăng ký toàn cục theo ngày** (quyết định chủ web): tối đa 500 tài khoản mới/ngày, reset 0h giờ Nhật. Đầy trần → `429 REGISTRATION_FULL` "本日の新規登録は定員に達しました。明日改めてご登録ください。". Hằng số `DAILY_REGISTRATION_LIMIT` (rate-limit-service) — đổi trần chỉ sửa 1 số.
- Cơ chế: dùng lại bảng `rate_limits` (đếm atomic phía Postgres, nhiều instance Vercel không đếm thiếu), key theo ngày JST `register:daily:YYYY-MM-DD`. Khác các rate-limit khác: đếm **tài khoản tạo thành công** — check trước khi tạo (repo thêm `peek` đọc-không-cộng), tạo xong mới cộng → request lỗi (trùng email…) không đốt quota, không thể phá bằng request hỏng. Fail-open khi DB lỗi như triết lý sẵn có.
- +5 unit test (dưới/chạm trần, key JST, fail-open, count lỗi không phá luồng); `docs/api/auth.md` cập nhật bảng ngưỡng + lý do.

## [0.13.1] — 2026-07-21 — Polling thông minh cho chat (giảm ~60-70% request)

### Hiệu năng
- **ChatPanel poll theo mức tương tác** thay vì cứng 6s: có tương tác trong 1 phút gần nhất (gõ, chạm ô nhập, cuộn lịch sử, gửi tin, NHẬN tin đối phương) → 5s; im ắng 1–5 phút → 15s; treo >5 phút → 60s. Chuỗi `setTimeout` tự chọn delay mỗi tick (thay `setInterval`); tab ẩn bỏ qua tick. Quay lại tab / đối phương nhắn → reset về nhịp 5s ngay nên hội thoại đang nóng vẫn mượt như cũ. Trade-off ghi rõ trong code: cả 2 bên treo >5 phút thì tin đầu trễ tối đa ~60s.
- **Poll unread ở nav chỉ chạy khi tab hiển thị** (trước đây `setInterval` 15s chạy cả khi tab ẩn — mỗi tab treo tốn 4 req/phút vô ích); thêm listener `visibilitychange` để quay lại tab là refresh ngay.
- Động cơ: chat polling là nguồn request lớn nhất của web (user treo chat ~14 req/phút) — đây là đòn 80/20 trước khi chuyển Supabase Realtime (roadmap). `docs/api/chat.md` cập nhật.

## [0.13.0] — 2026-07-21 — Đợt rà soát UX: sửa 10 lỗi/chỗ chưa logic toàn site

### Sửa lỗi
- **iOS auto-zoom trên MỌI ô nhập** (không chỉ ô chat đã vá ở 0.12.7): rule toàn cục trong `globals.css` — dưới 640px mọi `input/select/textarea` tối thiểu 16px (rule ngoài `@layer` nên thắng utility `text-sm`). Hết cảnh focus ô giá trong TradePanel / ô tìm kiếm / form đăng tin là Safari phóng to vỡ layout.
- **Lỗi hành động phụ "nuốt" cả trang chi tiết**: trang tin bán + tin gom dùng chung 1 state error cho cả lỗi tải lẫn lỗi nút (hủy tin, sửa giá) → request fail là nguyên trang bị thay bằng 1 ô đỏ, phải reload. Tách `actionError` hiện inline cạnh nút; lỗi tải mới thay trang.
- **Link verify email bấm lần 2 báo "link hỏng" dù đã verify xong**: `verifyEmail` giờ idempotent — token đã đốt nhưng user của token ĐÃ verified → trả thành công (mail scanner Gmail/Outlook prefetch link cũng không còn gây lỗi ảo; StrictMode dev double-fire hết hiện lỗi sai). Repo thêm `findTokenWithUser`; +2 unit test; `docs/api/auth.md` cập nhật.
- **Nút "＋ đăng ký thẻ mới" trong autocomplete fail im lặng** (vd. chưa verify email): giờ hiện message lỗi đỏ dưới ô (`sell.createFail` fallback).
- **Nút gửi lại mail xác nhận fail im lặng** (vd. dính rate limit): banner giờ hiện lỗi (`banner.resendFail`).

### UX / chưa logic
- **Danh sách chat có huy hiệu chưa đọc từng dòng**: `ConversationDto` thêm `unreadCount` (cùng quy tắc đếm với tổng ở nav, gồm "tối thiểu 1 khi vừa match"); dòng có tin mới in đậm + badge đỏ, mở hội thoại là tắt badge ngay (không chờ refetch). `UnreadBadge` chuyển từ nav-bar sang `ui.tsx` dùng chung. `docs/api/chat.md` cập nhật.
- **Luồng mua trên tin đã đóng/hủy**: buyer có request pending giờ thấy "tin đã ngừng nhận yêu cầu" (`buy.listingClosed`) thay vì box "chờ seller kết nối" treo vĩnh viễn; phía seller ẩn nút 連携 với người chưa kết nối (link chat đã kết nối giữ nguyên) + dòng ghi chú.
- **Ô lý do report**: thêm hint "tối thiểu 10 ký tự" (`seller.reportHint`) — trước đây nút xám không rõ vì sao (2 chỗ: SellerSummary + trang hồ sơ).
- **Responsive**: hàng giá trang chi tiết tin thêm `flex-wrap` (giá dài + 2 badge + nút sửa giá tràn ngang màn 375px); form chào bán tin gom xếp dọc dưới `sm` (trước đây ô lời nhắn bị bóp còn vài chục px).
- SellerSummary catch lỗi tải summary (trước đây unhandled rejection).

i18n mới đủ ja/vi/en: `sell.createFail`, `buy.listingClosed`, `seller.reportHint`, `banner.resendFail`.

## [0.12.8] — 2026-07-21 — Nhắc gặp mặt trước khi chốt giá

### Tính năng
- **Dòng nhắc trên khu chốt giá trong chat** (`trade.meetFirst`, box vàng 🤝): "gặp mặt trực tiếp và hoàn tất giao dịch rồi mới bấm chốt giá và đánh giá" — chặn tâm lý báo hoàn tất khống trước khi hai bên thật sự trao đổi (bảo vệ chất lượng dữ liệu giá đóng). Hiện ở giai đoạn chưa có trade (trước ô 成約金額); giai đoạn xác nhận đã có sẵn `safety.confirm`. i18n đủ ja/vi/en.

## [0.12.7] — 2026-07-21 — Sửa chat: cuộn xem lịch sử + layout iPhone

### Sửa lỗi
- **Không cuộn lên xem tin nhắn cũ được**: `ChatPanel` dùng `h-full` trong flex column — `min-height:auto` giữ khung cao bằng toàn bộ tin → tràn khỏi `overflow-hidden`, tin cũ bị cắt cụt không có scrollbar. Sửa: chuỗi `min-h-0` + `flex-1` đúng chuẩn (chat/page.tsx grid `grid-rows-[minmax(0,1fr)]`, section/aside/ChatPanel/list đều min-h-0); danh sách hội thoại mobile cũng cuộn được nhờ đó.
- **Autoscroll giật xuống đáy khi đang đọc lịch sử**: bỏ `scrollIntoView` (kéo cả trang — giật với URL bar iPhone), thay bằng cuộn trong container + cờ "bám đáy" đo NGAY TRƯỚC khi thêm tin mới (không dựa scroll event — không phát khi tab ẩn): đang ở đáy → tin mới tự cuộn xuống; đang đọc phía trên → giữ nguyên vị trí; tự gửi tin → luôn cuộn xuống.

### iPhone
- `100vh` → `100dvh`: iOS Safari tính vh gồm cả vùng URL bar → ô nhập chat bị đẩy khỏi màn hình; dvh bám viewport thật.
- Input chat `text-base` (16px) trên mobile: chặn iOS Safari tự phóng to trang khi focus input <16px (nguyên nhân vỡ layout khi gõ).
- Header/safety/form `shrink-0`; TradePanel `shrink-0 max-h-[50%] overflow-y-auto` — quá cao thì tự cuộn bên trong, không đè khung chat.
- Verify (viewport 375×812, dev + prod DB, hội thoại test 26+ tin, đã xóa sạch): load tự cuộn xuống tin mới nhất; cuộn lên tới tin 1 OK; tin mới đến khi đang đọc lịch sử → không giật (scrollTop giữ nguyên); đang ở đáy → tự cuộn; desktop nguyên vẹn. 190 test pass.

## [0.12.6] — 2026-07-21 — Chủ tin sửa giá chào sau khi đăng

### Tính năng
- **Chủ tin đổi giá chào (`askingPriceJpy`) trên trang chi tiết tin**: nút 価格を変更 cạnh giá (chỉ chủ tin + tin `active`), editor inline — nhập số mới hoặc để trống → 要相談. `PATCH /api/listings/:id` giờ nhận union: `{status:"cancelled"}` (gỡ tin, như cũ) HOẶC `{askingPriceJpy: number|null}` (sửa giá). Service `updatePrice` guard: 404/403/`409 INVALID_STATUS` (khác active — tin đang giao dịch/đã đóng khóa giá). Giá validate như khi tạo (1..10,000,000). **Không đụng `price_records`** — giá chào chỉ để thương lượng, giữ nguyên bất biến dữ liệu giá thị trường.
- i18n đủ ja/vi/en (detail.editPrice, detail.pricePlaceholder, common.save, common.cancel). Docs `docs/api/listings.md` cập nhật PATCH.
- Test: +5 unit (updatePrice: 404/403/409/đổi giá/null→要相談) — 190 test pass. Verify UI end-to-end trên dev+prod DB bằng tin test tạm (đã xóa ngay): 5000→8000 OK, trống→要相談 OK, prefill giá hiện tại OK; PATCH giá tin `in_trade` trả đúng 409.

## [0.12.5] — 2026-07-21 — Vá lỗ hổng postcss (override)

### Bảo mật
- **Vá postcss XSS ([GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93), moderate)**: Next 15.5.20 ghim `postcss@8.4.31` trong cây phụ thuộc riêng (`node_modules/next/node_modules/postcss`) — dính lỗ hổng "XSS via unescaped `</style>` in CSS Stringify Output" (postcss <8.5.10). Next 15.5.20 đã là bản 15.x mới nhất nên không có update Next để vá. Thêm `overrides.postcss: ^8.5.10` trong package.json → toàn cây (gồm bản nested của Next) lên `postcss@8.5.20`. `npm audit`: 2 moderate → **0 vulnerabilities**.
- Verify: `npm run build` sạch (Tailwind/CSS pipeline vẫn xử lý đúng, mọi route compile). Đây là công cụ build-time nên override an toàn — postcss 8.5.x tương thích ngược 8.4.x.

## [0.12.4] — 2026-07-21 — Tìm kiếm bảng tin theo tên ga

### Tính năng
- **Thanh tìm kiếm ở bảng tin bán lọc được cả tên ga gần nhất** (`station`): trước đây `q` chỉ khớp `contains` trên thẻ liên kết (tên JP/EN, set, số thẻ). Nay chuyển OR lên tầng listing để khớp **thẻ HOẶC `station`** (`listListings`, repositories/listings.ts). Lọc game/category vẫn giữ trên card (AND) như cũ. Placeholder cập nhật đủ 3 tiếng (ja/vi/en); `docs/api/listings.md` ghi rõ `q` match thêm `station`.
- Verify: `q=新松戸` / `q=松戸` (một phần ga) / `q=Thịt` (tên thẻ — chống hồi quy) đều ra kết quả; UI trang chủ hiển thị đúng. 185 unit test pass, `tsc` sạch. Tin gom (buy-orders) không có trường ga nên không đổi.

## [0.12.3] — 2026-07-20 — Migrate DB + region sang Tokyo (cắt vòng Sydney)

### Hiệu năng (gốc rễ độ trễ)
- **Chuyển toàn bộ hạ tầng từ Sydney sang Tokyo**: user ở Nhật, trước đó Vercel function + Supabase DB đều ở Sydney → mỗi request động vòng Tokyo→Sydney→Tokyo (~+250–400ms). Giờ cùng vùng Tokyo, cắt hẳn vòng này.
  - Supabase project mới `ofwrdcwrqtmhxgogmqlf` region Northeast Asia (Tokyo), pooler `aws-0-ap-northeast-1`.
  - Vercel function region `syd1` → `hnd1` (`vercel.json`).
  - Env production + preview cập nhật: DATABASE_URL, DIRECT_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
- **Kết quả đo** (endpoint động, không cache): `/api/listings?mine=1` từ 0.3–0.9s (Sydney) → **~0.25s ổn định** (Tokyo); SSR trang chủ (warm) ~0.19–0.39s.

### Migration
- Schema qua `prisma migrate deploy` (4 migration). Dữ liệu: 2 user, 47 thẻ, 1 listing, 5 session, 10 email token, 10 rate limit — dump JSON rồi `createMany`. Ảnh listing (1 file) chuyển sang bucket public `uploads` mới + cập nhật `imageUrl` trong DB. VIP của admin, hash mật khẩu, session giữ nguyên (user đang đăng nhập không bị đá ra).
- Verify production: web đọc DB Tokyo OK, listing "Thịt bò" render kèm ảnh Tokyo, VIP=true, console sạch.
- Project Supabase Sydney cũ **chưa xóa** — giữ làm rollback; xóa sau vài ngày khi chắc chắn ổn (`.env.sydney-backup` + `deal-migration-dump.json` ở máy local cũng là bản lưu).

## [0.12.2] — 2026-07-20 — Tối ưu tốc độ: CDN cache cho GET công khai

### Hiệu năng
- **Chẩn đoán**: user ở Nhật, edge Vercel Tokyo rất gần (connect ~0.09s) nhưng function + DB ghim Sydney → mỗi request công khai vòng Tokyo→Sydney, TTFB đo thực tế 0.3–0.97s.
- **CDN cache ở edge cho GET công khai** (`src/server/cache.ts`): `/api/listings` + `/api/buy-orders` (bản công khai; 15s + swr 60s), `/api/listings/:id` (15s), `/api/cards` (catalog gần tĩnh; 60s + swr 300s). Lượt sau phục vụ từ PoP Tokyo ~50ms thay vì ~400ms. Bản cá nhân `mine=1` trả `private, no-store` — CDN không bao giờ đụng; response lỗi không có s-maxage nên không bị cache.
- Đánh đổi chấp nhận: bảng tin/chi tiết cũ tối đa 15s; mọi hành động ghi vẫn validate server nên không mất an toàn.
- **Chưa xử lý gốc rễ** (ghi lại để quyết sau): chuyển Supabase + Vercel function sang Tokyo (`ap-northeast-1` + `hnd1`) — SSR trang chủ và mọi API động sẽ nhanh thêm ~200–300ms, nhưng cần tạo project Supabase mới + migrate dữ liệu (downtime ngắn).

## [0.12.1] — 2026-07-20 — Tự thêm thẻ mới khi đăng bán (mọi game) + tin VIP lên đầu bảng

### Tính năng
- **Tự thêm thẻ/sản phẩm mới ở form đăng bán — MỌI game** (nới business-rules #13 theo quyết định chủ web; trước đó chỉ mục その他): gõ tên không khớp chính xác thẻ nào trong catalog → nút "＋「…」を新しい商品として登録" (CardAutocomplete, giờ áp dụng cả pokemon/onepiece). `POST /api/cards` nhận thêm `game` (optional, mặc định "other" — tương thích client cũ), find-or-create theo (game, tên, category). Entry tự thêm của pokemon/onepiece mang `setCode CUSTOM/CUSTOM-BOX` (`userProductSetCode`) — tách khỏi catalog chuẩn, lọc được khi làm sạch dataset giá. UI ẩn dòng thông số với mọi entry tự thêm (`isUserProduct` trong labels.ts). Đổi tên `createOtherProduct` → `createUserProduct` xuyên suốt.
- **Tin của người bán VIP lên đầu bảng danh sách** (đặc quyền VIP): `listListings` orderBy `[{seller.isVip desc}, {createdAt desc}]` — trong mỗi nhóm vẫn mới nhất trước. Áp dụng mọi nơi dùng danh sách listing (trang chủ, tìm kiếm, hồ sơ).

### Docs
- `docs/business-rules.md` #13 viết lại (catalog ưu tiên, tự thêm khi thiếu + đánh đổi dataset), `docs/api/cards-uploads.md` (POST /api/cards mới), `docs/api/listings.md` (thứ tự VIP).

### Kiểm thử
- Verify trên dev (phiên tạm cho admin, đã xóa ngay sau đó; không ghi thẻ test vào DB): tab ポケモン gõ tên lạ → nút thêm mới hiện đúng; API listings trả `sellerIsVip:true` và VIP đứng đầu; POST /api/cards không auth → 401. 185 test pass (+6: pokemon tạo được, quy ước setCode), `tsc` sạch, build OK.

## [0.12.0] — 2026-07-20 — Tính năng VIP (chủ web chỉ định)

### Tính năng
- **VIP do chủ web chỉ định**: cột `users.is_vip` (default false) — chỉ chủ web bật thủ công trong Supabase (không self-service, giống cách duyệt report). Migration `20260719000000_user_vip` (additive, đã `migrate deploy` lên production).
- **Huy hiệu VIP hiển thị ở MỌI nơi kèm tên**: vương miện 👑 + nhãn VIP (component `VipName`/`VipBadge` trong `ui.tsx`). Đã gắn: hồ sơ công khai `/users/:id`, danh sách + header chat, tên mình ở nav + `/me`, bình luận, badge người bán (`SellerSummary`), chào bán tin gom (`OfferPanel`), yêu cầu mua (`PurchasePanel`), đối tác giao dịch (`/me`), người đánh giá trong review. Thread cờ `isVip` qua toàn bộ DTO mang tên (UserDto, MessageDto, ListingDto, ConversationDto, TradeDto, CommentDto, BuyOrder/Offer/Request, UserSummary, UserProfile, ProfileReview) + 14 select repository + serializers.
- **VIP nâng level sàn 10**: `displayLevel(xp, isVip)` = `max(10, level_thật)` — VIP luôn ≥ Lv.10, ai tự đạt cao hơn thì giữ mức cao hơn (không kéo tụt). Trust score / badge / XP vẫn derived thật, không đổi.

### Cách chỉ định VIP (chủ web)
- Supabase → Table `users` → sửa dòng người muốn cho VIP → tick `is_vip` = true. Hiệu lực ngay lần tải trang sau, không cần deploy.

### Kiểm thử
- Verify end-to-end trên dev (nối prod DB): tạm bật VIP cho 1 tài khoản → API `/users/:id/profile` trả `isVip:true, level:10`; trang hồ sơ hiện "admin 👑 VIP · Lv.10"; **đã trả tài khoản về non-VIP ngay** (prod sạch, 0 VIP). 179 test pass (+3 `displayLevel`), `tsc` sạch, `next build` OK.

## [0.11.5] — 2026-07-19 — Hash token phiên/email ở DB + Dependabot + CI

### Bảo mật
- **Hash token khi lưu DB** (`src/server/token-hash.ts` mới, SHA-256): session token và email token (verify/reset) trước đây lưu THÔ — DB bị đọc trộm là mạo danh phiên/đổi mật khẩu được. Giờ token thô chỉ nằm ở cookie/link email; DB lưu SHA-256 (một chiều). Token thô 32 byte high-entropy nên SHA-256 đủ (không cần bcrypt/salt như mật khẩu low-entropy). Cùng độ dài 64 hex → **không cần migration schema**, chỉ đổi giá trị lưu.
  - `session.ts`: create lưu hash, get/destroy tra theo hash (3 hàm đối xứng).
  - `email-tokens.ts`: `issueToken` lưu hash + trả token thô cho email; `findValidToken` hash trước khi tra.
  - Test mới `tests/token-hash.test.ts` (4 ca: xác định, phân biệt, đúng định dạng, một chiều).
- **⚠️ Deploy này đăng xuất TOÀN BỘ user một lần** (token cũ dạng thô không khớp hash) — user chỉ cần đăng nhập lại. Link verify/reset đang treo (TTL 24h/1h) cũng vô hiệu, user request lại là xong.

### Hạ tầng
- **Dependabot** (`.github/dependabot.yml`): quét lỗ hổng + cập nhật npm & github-actions hằng tuần (thứ Hai 09:00 JST), gộp minor/patch vào 1 PR, major tách riêng.
- **CI** (`.github/workflows/ci.yml`): mọi push main + mọi PR (gồm PR Dependabot) tự chạy `tsc --noEmit` + `npm test` trên Node 20 — không bản cập nhật nào merge được nếu làm hỏng typecheck/test.

### Kiểm thử
- 176 test pass (+4 token-hash), `tsc --noEmit` sạch, dev server khởi động sạch không lỗi. Xác minh tính đúng bằng test + đối xứng code (không đăng ký thử vì `.env` local trỏ DB production — tránh ghi dữ liệu rác).

## [0.11.4] — 2026-07-19 — Gia cố bảo mật: security headers + CSP, middleware chống CSRF, rate-limit upload

### Bảo mật
- **Security headers toàn site** (`next.config.ts`): Content-Security-Policy (chặn XSS tải script lạ; `frame-ancestors 'none'` + `X-Frame-Options: DENY` chặn clickjacking; `form-action 'self'` chặn form bắn dữ liệu ra ngoài; ảnh chỉ cho phép self + Supabase Storage), HSTS 2 năm kèm subdomain, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, Permissions-Policy tắt camera/mic/GPS/payment. CSP dev nới thêm `'unsafe-eval'` + `ws:` cho HMR; production thêm `upgrade-insecure-requests`.
- **Middleware chống CSRF lớp 2** (`src/middleware.ts`, matcher `/api/*`): request ghi (non-GET) có header Origin không khớp host → 403. Lớp 1 sẵn có là cookie `sameSite=lax`. Request không có Origin (curl/API client) cho qua — không mang cookie nạn nhân nên không phải CSRF.
- **Rate-limit upload ảnh** (`upload:user`, 30 ảnh/10 phút): trước đó upload không giới hạn — có thể spam đầy bucket Supabase (mỗi ảnh tới 5MB).

### Ghi chú audit
- Đã rà và xác nhận tốt sẵn: bcrypt cost 10, rate-limit đủ các đường auth (login/register/forgot/reset/resend), session cookie httpOnly+secure+sameSite, upload validate MIME/size, lỗi API không leak stack trace, `clientIp` ưu tiên header không giả mạo được của Vercel, mọi service đều check quyền thành viên.
- `npm audit`: 2 moderate là `postcss` transitive trong Next (XSS khi stringify CSS không tin cậy — app không làm việc này, bản Next mới nhất cũng chưa thoát range). Theo dõi chờ Next vá.

### Kiểm thử
- Verify trên dev server: 6 header đủ trên mọi response; CSRF test 3 kịch bản (Origin lạ → 403, same-origin → qua, không Origin → qua); trang render sạch không lỗi CSP console. 172 test pass, `tsc --noEmit` sạch, `next build` thành công (middleware 34.3 kB).

## [0.11.3] — 2026-07-19 — Fix chat: hiện lỗi khi gửi tin nhắn thất bại

### Sửa lỗi
- **Gửi tin chat thất bại im lặng**: `handleSend` trong `src/components/chat-panel.tsx` chỉ có `try/finally` không `catch` — mạng lỗi/server từ chối thì tin không đi nhưng UI không báo gì. Thêm `catch` theo mẫu sẵn có của dự án (`comments-section.tsx`): lỗi `ApiClientError` hiện đúng thông điệp server, lỗi khác hiện khóa i18n mới `chat.sendFail` (ja/vi/en). `ErrorBox` hiện ngay trên ô nhập; draft giữ nguyên để bấm gửi lại; lỗi tự xóa khi gửi thành công hoặc chuyển hội thoại.

### Kiểm thử
- 172 test pass, `tsc --noEmit` sạch, `next build` thành công (35 trang). Trang /chat biên dịch & render sạch trên dev server.

## [0.11.2] — 2026-07-18 — Fix mail hố đen: đảo chuỗi gửi thành Gmail SMTP → Brevo

### Sửa lỗi
- **Mail production không tới hộp thư** (verify/resend/reset sau ~14:18Z 17/7): Brevo với sender freemail (`@gmail.com`) → API nhận (2xx, log `[mail][brevo] sent`) nhưng Gmail từ chối thẳng ở cửa SMTP (mail đứng tên gmail.com không có DKIM của Google) — không vào nổi cả spam, và vì code thấy "thành công" nên không bao giờ fallback sang Gmail SMTP. Chẩn đoán bằng: log Vercel có `[mail][brevo] sent` + hộp Gmail (kể cả spam/trash) 0 mail từ Brevo; mọi mail từng tới nơi đều mang label SENT (= đi đường Gmail SMTP).
- **Đảo thứ tự `sendMail`**: Gmail SMTP trước (tự xác thực → chắc chắn tới nơi), Brevo thành đường dự phòng. Chỉ đảo lại như cũ sau khi có domain riêng authenticate SPF/DKIM trên Brevo — ghi rõ ở [docs/email.md](docs/email.md).

### Kiểm thử
- 172 test pass (`tests/mailer.test.ts` viết lại theo thứ tự mới: SMTP chính, fallback khi SMTP lỗi, ném lỗi khi hết đường, thiếu `SMTP_PASS` coi như chưa cấu hình). `tsc --noEmit` sạch. Verify trên production: log `[mail][smtp] sent` + mail về hộp thư thật.

## [0.11.1] — 2026-07-17 — Email dự phòng: chuỗi Brevo → Gmail SMTP

### Hạ tầng
- **`sendMail` thành chuỗi dự phòng** (`src/server/mailer.ts`): có `BREVO_API_KEY`+`BREVO_FROM` → gửi qua Brevo HTTP API trước (free 300 mail/ngày, timeout 10s); lỗi → fallback Gmail SMTP; cả hai trống → dev outbox như cũ. Lý do: Gmail giới hạn ~500 người nhận/ngày, vượt là bị chặn gửi 24–72h — một đường duy nhất là điểm chết khi có traffic thật.
- Chưa set env Brevo thì hành vi y hệt cũ (Gmail chính) — deploy an toàn, thêm key lúc nào cũng được.
- `isSmtpConfigured` → `isMailConfigured` (Brevo HOẶC SMTP): `/dev/mailbox` tự tắt khi có bất kỳ đường gửi thật nào.
- Env đọc tại thời điểm gọi (không phải lúc import) — test được bằng `vi.stubEnv`, và thêm key trên Vercel chỉ cần redeploy.
- Setup Brevo (verify sender, lấy API key) ghi ở [docs/email.md](docs/email.md).

### Kiểm thử
- 171 test pass (+7 `tests/mailer.test.ts`: chọn đúng đường theo env, fallback khi Brevo lỗi, ném lỗi khi hết đường, thiếu `BREVO_FROM` coi như chưa cấu hình).

## [0.11.0] — 2026-07-17 — Mục その他/Khác: bán sản phẩm ngoài Pokémon & One Piece

### Tính năng
- **Game thứ 3 `other`** bên cạnh pokemon/onepiece: tab その他 ở bảng tin (trang chủ + まとめ買い), pill trong form đăng bán & đăng tin gom. Không cần migration — cột `game` là String.
- **`POST /api/cards`** (verified user): mục other không có catalog → user tự đặt tên sản phẩm (find-or-create theo tên + category, idempotent; race chặn bằng unique constraint sẵn có của `cards`, bắt P2002). Ngoại lệ có chủ đích của business-rules #13 — Pokémon/One Piece vẫn chỉ chọn từ catalog.
- **CardAutocomplete** với `game=other`: gõ tên → search sản phẩm other đã có; chưa có tên trùng khớp → nút "＋「…」を新しい商品として登録" tạo và chọn luôn. Dùng chung cho cả form đăng bán lẫn tin gom.
- Quy ước lưu: `setCode="OTHER"/"OTHER-BOX"`, `cardNumber` = tên sản phẩm, `rarity="-"`, `language="JP"`. UI ẩn dòng set/số thẻ/rarity với card other (helper `cardSpec` mới trong `src/lib/labels.ts`, `cardTitle` nhận thêm `game`).

### Thiết kế (đọc trước khi sửa)
- Dữ liệu giá của `other` KHÔNG thuộc dataset lõi cho AI — dataset lõi vẫn là 2 game có catalog chuẩn hóa; vì vậy cho phép tên tự do ở mục này không phá mục tiêu chất lượng giá.
- i18n đủ 3 thứ tiếng cho toàn bộ chuỗi mới (`game.other`, `home.tabOther`, `sell.selectOther/searchOther/createOther`, `bon.selectOther`).

### Kiểm thử
- 164 test pass (+4 test mới `tests/card-service.test.ts`: tái sử dụng entry trùng tên, tạo mới, nhánh race P2002, lỗi khác ném tiếp). `tsc --noEmit` sạch.

## [0.10.0] — 2026-07-17 — Hồ sơ công khai & hệ tin cậy (P10, phần lõi spec Profile/Trust v2)

### Tính năng
- **Trang hồ sơ công khai `/users/:id`** + `GET /api/users/:id/profile`: avatar chữ cái, tier + level + thanh XP, **Trust Score 0–100** (chỉ số uy tín chính), badge, thống kê giao dịch (đã chốt / số đối tác khác nhau / tỷ lệ hoàn thành / hủy), review đã reveal gần nhất, tin đang bán, nút 通報. Link vào hồ sơ từ SellerSummary (listing + tin gom) và tên đối phương trong chat.
- **Trust & Safety 🟢🟡🔴** (migration `20260717150000_report_status`: cột `reports.status` + `resolved_at`): 🔴 chỉ khi vi phạm **đã xác minh** (hiện số lần + ngày gần nhất); 🟡 cần **≥2 người khác nhau** đang report pending — 1 report lẻ không đổi hiển thị công khai (chống report bẩn, đúng mục tiêu spec); report pending KHÔNG trừ Trust Score. Chưa có admin UI — duyệt tạm ở DB.
- **Cảnh báo trước khi chốt trade** trong chat (TradePanel): đối phương 🟡/🔴 → banner cảnh báo kèm số vi phạm + trust score, hiện ở cả bước khai lẫn bước xác nhận. Fail-silent nếu không tải được hồ sơ (cảnh báo là lớp phụ, không chặn trade).
- `ConversationDto` thêm `otherPartyId`.

### Thiết kế (đọc trước khi sửa)
- **Mọi chỉ số derived tại thời điểm xem, KHÔNG lưu cột** (cùng triết lý contributionCount/ratingAvg) → không có bảng sự kiện XP, không farm được. XP: 30/trade + 10/5★ + 100/30 ngày sạch; **cố ý bỏ XP đăng nhập/đăng tin của spec** (nguồn XP phải là việc thật trên chợ). Trust Score thưởng **distinct partners** để chống bơm điểm bằng trade lặp với 1 đồng bọn.
- Phần spec hoãn (online status, follow, avatar, fast-reply badge, admin dashboard…) ghi ở [docs/roadmap.md](docs/roadmap.md).

### Kiểm thử
- 160 test pass (+28: biên tier, clamp trust score, ngưỡng badge, safety level). Verify browser: hồ sơ tài khoản thật render đúng (Lv.1 Bronze, trust 50, 🟢, tin đang bán), mobile 375px không tràn, link từ listing detail đúng. Nhánh cần đăng nhập (cảnh báo TradePanel) phủ bằng tsc + unit test.

## [0.9.4] — 2026-07-17 — Rate limit nhóm /api/auth/* (429 RATE_LIMITED)

### Bảo mật
- **Chặn dò mật khẩu + spam mail** trước khi mở test rộng. Bảng mới `rate_limits` (migration `20260717120000_rate_limits`, thuần `CREATE TABLE`). Ngưỡng khai báo tập trung ở `LIMITS` (`src/server/services/rate-limit-service.ts`) — bảng đầy đủ + lý do từng con số ở [docs/api/auth.md](docs/api/auth.md).
- **Login chặn 2 chiều** (IP 20/10ph + email 8/10ph): đổi IP KHÔNG lách được giới hạn theo email. Đếm TRƯỚC khi so mật khẩu (chỉ đếm lần sai thì vẫn thử được vô hạn tới lúc đoán trúng); đăng nhập thành công thì xóa bộ đếm để người thật gõ sai vài lần không bị phạt tiếp.
- **Nhóm gửi mail siết nhất** (`forgot` 3/giờ mỗi email, `register` 5/giờ mỗi IP, `resend-verification` 3/giờ mỗi user) — mỗi request là 1 mail thật qua Gmail SMTP: tốn quota và có nguy cơ bị Google khóa App Password nếu bị lợi dụng spam.
- `forgot` **vẫn không lộ email nào tồn tại**: bộ đếm chạy trước và độc lập với việc email có trong DB → 429 đến cùng thời điểm dù email thật hay không.
- **Bộ đếm ở Postgres chứ không phải RAM** — Vercel serverless nhiều instance + cold start nên đếm trong RAM vô nghĩa. Tăng bằng MỘT câu `INSERT … ON CONFLICT` atomic: đọc-rồi-ghi ở tầng app sẽ đếm thiếu khi request chạy song song.
- **FAIL-OPEN có chủ đích**: bộ đếm lỗi (pooler nguội) → cho request đi tiếp thay vì khóa cả app. Không mất an ninh vì mọi hành động ở đây đều cần DB mới làm được việc.
- IP lấy từ `x-vercel-forwarded-for` (edge Vercel ghi đè, client không giả mạo được), `x-forwarded-for` chỉ là dự phòng.

### Kiểm thử
- 132 test pass (+10 test mới cho rate-limit-service: biên ngưỡng, chuẩn hóa key, fail-open). Verify thật trên dev server: lần 9 đăng nhập sai → 429; đổi 3 IP vẫn 429 (không lách được); email khác không bị vạ lây; `forgot` chặn ở lần 4; **20 request song song đếm đúng 20** (không lost update). Dọn sạch hàng test khỏi DB sau khi xong.

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

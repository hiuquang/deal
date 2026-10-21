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

⚠️ **Sửa 2026-10-21**: bản v0.32.0 ghi `yuyu_tei`, `hareruya2_TCG`, `cardlabo_` — đối chiếu trang chính thức thì KHÔNG phải tài khoản shop trỏ tới. Đã thay bằng `yuyuteiNews`, `hareruya2pokeca`, `cardlabo_info` (lấy từ link trên site của chính shop). `cardrush_pokemon`, `FullaheadTcg` vẫn CHƯA kiểm. **Handle phải lấy từ trang chính thức, không đoán theo tên.**

## Ba loại giá — KHÔNG trộn

Cột `reference_prices.kind`:

| kind | Nghĩa | Nguồn |
|---|---|---|
| `kaitori` | Shop thu vào — **giá sàn** | X, qua Grok |
| `ban` | Đã bán xong | Facebook, nhập tay |
| `rao` | Đang rao (mặc định) | Facebook, nhập tay |

Trang giá hiện **ba nhóm riêng, mỗi nhóm một thống kê**. Trộn chung ra con số vô nghĩa mà nhìn vẫn như thật — đây là lỗi tồn tại từ v0.21.0 tới v0.31.0 (nhãn `source` chỉ để hiển thị, không tách thống kê), sửa ở v0.32.0. **Đừng gộp lại.**

## Trang 買取 công khai — `/kaitori` → `/kaitori/tokyo`, `/kaitori/osaka`

Quyết định chủ web (2026-10-21): **vào trang là chọn khu vực**, chọn xong thấy **5 shop nằm ngang**, bên dưới là **bài 買取 các shop đó đăng trên X**, cập nhật **4 tiếng/lần**, bài **quá 2 ngày tự xóa**. Đã bỏ hết phần giải thích (ba mức giá, 5 điều trước khi đi) — chủ web muốn trang gọn.

- `/kaitori`: chỉ hai thẻ chọn vùng.
- `/kaitori/[vùng]`: tĩnh + ISR 10 phút (`dynamicParams = false` → vùng lạ 404). Route riêng chứ không dùng `?region=` để mỗi vùng là một trang tĩnh, link dán vào group trỏ thẳng đúng vùng.
- Chỉ tiếng Việt (như `/terms`); nhãn nav để nguyên **買取** ở cả hai ngôn ngữ (quyết định chủ web — đó là chữ trên biển hiệu shop).

### Tin có thể làm giá biến động — `src/lib/kaitori-news.ts`

Trang chọn vùng `/kaitori` hiện **4 tin mới nhất** (`NEWS_ON_PAGE`; chủ web chốt 3 rồi xin thêm tin SNKRDUNK, 2026-10-21), đặt SAU hai thẻ chọn vùng. Dữ liệu tĩnh trong code, mỗi lần đổi tin là một lần deploy.

**Quy tắc (test `tests/kaitori-news.test.ts` chặn phần máy kiểm được):**

1. **Chỉ nguồn chính thức** = trang của chính tổ chức ra quyết định (`OFFICIAL_NEWS_HOSTS`): hãng Pokémon (pokemon-card.com, pokemoncenter-online.com, pokemon.co.jp + subdomain), hoặc **sàn bán lại thông báo chính sách của chính sàn** (snkrdunk.com, about.mercari.com — KHÔNG phải jp.mercari.com nơi có tin đăng). Không tin đồn, không leak, không báo tổng hợp, không bài của shop hay group — tin sai trên trang về GIÁ là người ta bán hớ thật. Với SNKRDUNK: chỉ tóm tắt thông báo công khai + dẫn link; lập trường không lấy dữ liệu giá/tin đăng của sàn vẫn giữ nguyên.
2. **Tự viết tóm tắt tiếng Việt**, không chép nguyên văn, không lấy ảnh; luôn kèm link bài gốc.
3. **Chỉ chọn tin đụng tới cung/cầu thật**: bán thêm, bốc thăm, in lại, promo, đổi luật thi đấu, sàn lớn cấm/ngừng bán. Tin sự kiện, livestream, phỏng vấn thì bỏ, dù mới hơn.
4. `impact` nói **cơ chế** ("nguồn cung tăng"), **không phán con số** giá lên/xuống bao nhiêu.
5. Soát lại thì cập nhật `NEWS_CHECKED_ON` — ngày này hiện ngay dưới tiêu đề khối tin.

Nguồn tin: trang tin chính thức <https://www.pokemon-card.com/info/> và mục tin của Pokémon Center Online. Đọc nguyên văn trang gốc trước khi viết, và đọc TỚI CUỐI: câu quan trọng nhất của tin 29/09 (đợt bốc thăm thêm box 30th tháng 12) nằm ở dòng cuối trang, đọc mỗi phần đầu là mất.

### Danh bạ — `src/lib/kaitori-shops.ts`

Dữ liệu trong code, không phải DB. **5 shop mỗi vùng do chủ web chọn tay** (`FEATURED_SHOP_IDS`) — chưa có dữ liệu 買取 theo shop để xếp tự động; đừng tự đổi sang xếp theo số liệu khi chưa bàn lại. Trang ghi "5 shop thu thẻ", **không** ghi "giá cao nhất": chưa có số liệu nào chứng minh điều đó.

**Quy tắc (test `tests/kaitori-shops.test.ts` giữ phần máy kiểm được):**

1. Chỉ thêm shop/handle khi đã **tự mở được trang chính thức** và thấy tận mắt. **Handle X phải lấy từ link trên trang cửa hàng chính thức**, không đoán theo tên (xem vụ 3 handle sai ở trên).
2. **Không ghi địa chỉ chi tiết, giờ mở cửa, con số giá.** Chỉ khu/ga + link chính thức.
3. Soát lại thì cập nhật `DIRECTORY_CHECKED_ON`.
4. **Thêm handle là thêm tiền** — mỗi handle bị quét 4 tiếng/lần.

Handle quét = tài khoản **của chi nhánh trong vùng** (`branches[vùng].xHandles`) + shop online (`online.xHandles`, hiện ở mọi vùng). Tài khoản chung của chuỗi (`xHandle`) **không quét**: nó đăng khuyến mãi toàn quốc, không cho biết gì về vùng, mà quét thì bài Tokyo và Osaka y hệt nhau.

| Shop | Tokyo | Osaka · Kansai | Nguồn handle |
|---|---|---|---|
| 晴れる屋2 | `hareruya2tower`, `hareruya2ikbkr` | `hareruya2namba` | trang từng cửa hàng trên hareruya2.com |
| カードラボ | `akihabara_labo` | `namba_clabo`, `nipponbashi_lab` | menu "Twitter" của từng cửa hàng trên c-labo.jp |
| ホビーステーション | (chi nhánh Tokyo không công bố) | `HBSTnipponbashi` | hbst.net/shop/11 |
| 遊々亭 (online) | `yuyuteiNews` | `yuyuteiNews` | chân trang yuyu-tei.jp |
| 駿河屋 | không quét | không quét | shop đồ cũ tổng hợp — X đăng đủ thứ ngoài thẻ |

**Hai danh sách cố ý TÁCH**: `DEFAULT_SHOP_HANDLES` (nút quét GIÁ ở /admin, người duyệt) ≠ handle quét BÀI ở đây (tự động, chỉ lưu link). Gộp lại là mỗi lần sửa danh bạ sẽ lặng lẽ đổi luôn phạm vi quét giá.

**Chờ kiểm tay** (không đưa lên trang cho tới khi mở được trang chính thức):

| Shop | Vùng | Vướng ở đâu |
|---|---|---|
| ドラゴンスター (dorasuta.jp) | Osaka — 日本橋/なんば | Site chặn bot, cả WebFetch lẫn browser pane đều không đọc được. Cần mở bằng điện thoại, chép lại link trang 買取 + tài khoản X của chi nhánh. |
| カードラッシュ | Tokyo — 秋葉原, 池袋 | Đọc được trang cửa hàng (`cardrush-pokemon.jp/page/15`) nhưng KHÔNG tìm thấy trang 買取 chính thức. |

### Bài đăng X — luồng tự động KHÔNG có người duyệt

```
GitHub Actions (0 */4 * * *)  ── POST + Bearer CRON_SECRET ──▶  /api/cron/kaitori-posts
  1. xóa bài posted_at < now − 48h          (chạy TRƯỚC, kể cả khi bước sau dừng)
  2. đã đọc ≥ trần tháng?  → ghi lượt "budget", DỪNG (không gọi Grok)
  3. Grok + X Search: link bài 買取 của mọi handle, ngày UTC [now−6h, now+1d)
  4. lọc: đúng dạng link bài X · handle CÓ trong danh bạ · mốc giờ (snowflake) trong 48h
  5. bỏ bài đã có trong DB  →  hỏi oEmbed của X: bài có thật? tác giả đúng handle?
  6. lưu (post_id, handle, posted_at) · ghi lượt quét (số bài đã đọc)
  7. revalidatePath(/kaitori/tokyo, /kaitori/osaka)
```

**Vì sao được bỏ bước người duyệt ở đây** (trong khi luồng GIÁ thì tuyệt đối không):

1. Thứ được lưu là **LINK để nhúng**, không phải con số vào dataset. **Không bao giờ ghi vào `reference_prices` từ luồng này.**
2. Mọi thứ Grok khai đều bị bỏ, trừ cái link — và cái link phải qua 3 lớp: handle khớp danh bạ, **mốc giờ tự giải từ ID snowflake** (không tin ngày Grok đưa), và **chính X (oEmbed) xác nhận bài tồn tại + đúng tác giả**.
3. Nội dung bài do **X tự vẽ trong khung nhúng chính thức** (widgets.js). DEAL không chép chữ hay ảnh — đúng lập trường cũ "ghi dữ kiện, không sao chép nội dung", và đúng điều khoản hiển thị của X. Shop xóa bài trên X → bài tự mất ở DEAL.

**"2 ngày tự xóa"** chạy ở hai chỗ: xóa thật ở mỗi lượt quét, và **lọc 48 giờ lúc đọc** — lịch quét có chết thì bài cũ vẫn rơi khỏi trang đúng hạn (ISR 10 phút).

### Vì sao GitHub Actions mà không phải Vercel Cron

Gói Vercel **Hobby chỉ cho cron chạy 1 lần/ngày**; biểu thức dày hơn làm **hỏng deploy**. GitHub Actions miễn phí cho repo public. Hai điều cần biết:

- GitHub hay trễ lịch vài phút tới vài chục phút lúc đông → service nhìn ngược **6 giờ**, trùng thì dedupe theo `post_id`.
- **Repo public không có commit nào trong 60 ngày thì GitHub tự tắt lịch** → vào tab Actions bật lại.

### Chi phí — đọc kỹ

xAI tính **~$5 / 1.000 bài** X Search đọc. Bộ lọc ngày chỉ nhận **YYYY-MM-DD theo UTC** → không lọc được "4 tiếng vừa qua": **mỗi lượt đọc lại cả ngày**. 6 lượt/ngày × 8 handle chi nhánh.

Ước lượng thô: mỗi lượt đọc vài chục bài → **cỡ $10–40/tháng** nếu không có trần. Vì vậy có **trần cứng**:

| Env | Mặc định | Nghĩa |
|---|---|---|
| `KAITORI_POSTS_MONTHLY_BUDGET` | `2000` (≈ $10) | Số bài X Search tối đa đọc mỗi tháng (giờ JST). Chạm trần → các lượt sau bỏ qua tới đầu tháng; bài đã lưu vẫn hiện tới khi quá 48h. `0` = tắt hẳn việc quét. |

Số bài đã đọc nằm ở bảng `kaitori_post_runs` (cột `posts_fetched`, đúng con số xAI tính tiền). **Theo dõi tuần đầu rồi chỉnh trần.**

### Cấu hình

| Ở đâu | Tên | Ghi chú |
|---|---|---|
| Vercel env | `CRON_SECRET` | Chuỗi ngẫu nhiên dài (vd `openssl rand -hex 32`). **Thiếu → endpoint 404 (chặn hết).** |
| Vercel env | `XAI_API_KEY` | Đã có từ v0.32.0. Thiếu → endpoint 503, trang vẫn chạy (hiện "chưa có bài"). |
| GitHub → Settings → Secrets → Actions | `CRON_SECRET` | **Cùng giá trị** với Vercel. |
| GitHub → Variables (tùy chọn) | `DEAL_URL` | Mặc định `https://deal-green.vercel.app` — đổi khi có domain riêng. |

### CSP

Ngoại lệ DUY NHẤT trong `next.config.ts`: route `/kaitori/:region` cho `script-src https://platform.twitter.com` + `frame-src` platform/syndication.twitter.com. Mọi trang khác (form, chat, đăng nhập) giữ CSP chặt như cũ. Chính sách bảo mật có thêm đoạn nói rõ trang này tải nội dung từ X.

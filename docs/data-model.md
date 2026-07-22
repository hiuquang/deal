# Data model (hợp nhất mọi phase)

17 bảng. Schema thật: `prisma/schema.prisma`. Ghi chú `(P2)`/`(P3)`... = phase bổ sung.

```
users             id, email(unique), password_hash, display_name,
                  email_verified_at? (P4 — null = chưa xác nhận),
                  terms_accepted_version?, terms_accepted_at? (P5),
                  activity_seen_at? (mốc "đã xem hoạt động" cho badge thông báo
                  trang cá nhân — null = chưa xem lần nào, mọi item đều mới),
                  created_at, updated_at, deleted_at (soft delete)

sessions          id, token(unique), user_id→users, expires_at, created_at, updated_at

cards             id, game(pokemon|onepiece|other), category(single|box) (P3),
                  set_code, card_number, language(JP|EN),
                  name_ja, name_en, rarity, created_at, updated_at
                  unique(game, set_code, card_number, language)
                  — BOX là entry catalog với category=box, card_number="BOX"

listings          id, seller_id→users, card_id→cards, condition, image_url,
                  asking_price_jpy?, quantity(default 1, 1–99),
                  trade_type(sell|trade), note?,
                  station? (P6.1 — 最寄り駅, ≤50 ký tự),
                  status(active|in_trade|closed|cancelled),
                  created_at, updated_at
                  ── quantity hiện CHỈ là thông tin (số lượng người bán có);
                     luồng trade chưa trừ tồn từng đơn (đóng listing khi 1
                     giao dịch chốt). Muốn tồn kho thật = thay đổi lớn ở trade.

conversations     id, listing_id?→listings, buy_order_id?→buy_orders (P8),
                  messages_purge_at? / messages_purged_at? (v0.16.0 — tự xóa
                  nội dung chat 1 ngày sau khi trade + cả 2 đánh giá xong; sweep
                  lazy, xem api/chat.md).
                  buyer_id→users, seller_id→users NOT NULL (P8 lưu trực tiếp
                    thay vì suy từ listing.seller_id, backfill hàng cũ;
                    P9.1 siết NOT NULL),
                  buyer_last_read_at?, seller_last_read_at? (mốc đã đọc/bên,
                    null = chưa mở → dùng đếm tin chưa đọc + báo match),
                  created_at, updated_at
                  unique(listing_id, buyer_id); unique(buy_order_id, seller_id)
                  index(buyer_id); index(seller_id) — phục vụ poll tin chưa
                    đọc 15s/user (query nóng nhất app)
                  — nguồn gốc: listing (mua thường) HOẶC buy_order (tin gom).
                    Chỉ tạo qua connect (purchase_requests / buy_order_offers).

buy_orders (P8)   id, buyer_id→users, card_id→cards, quantity(1–999),
                  max_unit_price_jpy? (đơn giá tối đa mong muốn),
                  image_url? (ảnh minh họa thẻ muốn gom, tùy chọn — v0.18.0,
                    validate qua isOwnImageUrl như listing),
                  status(active|cancelled), created_at, updated_at
                  — tin "gom số lượng lớn": người mua cần N bản của 1 thẻ.
                    Giai đoạn 1 CHƯA ghi giá (chỉ kết nối sang chat riêng).

buy_order_offers  id, buy_order_id→buy_orders (cascade), seller_id→users,
(P8)              quantity, message? (≤300), status(pending|connected),
                  created_at, updated_at
                  unique(buy_order_id, seller_id) — 1 chào bán/người bán/tin

messages          id, conversation_id→conversations, sender_id→users, body,
                  created_at, updated_at

trades            id, listing_id?→listings, buy_order_id?→buy_orders (P9),
                  conversation_id, seller_id, buyer_id, initiator_id,
                  card_id→cards, condition, quantity(default 1) (P9 —
                    denormalize: nguồn cho price_record, hết phụ thuộc listing;
                    backfill từ listing cho trade cũ),
                  final_price_jpy (= ĐƠN GIÁ/1 bản với trade buy-order),
                  status(pending|confirmed|self_reported|cancelled),
                  auto_close_at, confirmed_at?, created_at, updated_at
                  ── 2 partial unique index (WHERE status != cancelled):
                     trades_one_active_per_listing + trades_one_active_per_conversation

price_records     id, trade_id(unique)→trades, card_id→cards, condition,
                  price_jpy, reliability(confirmed|self_reported),
                  flagged BOOLEAN default false (P2), traded_at,
                  created_at, updated_at
                  ── KHÔNG có cột user nào: ẩn danh từ tầng schema.
                     Denormalize card_id/condition từ listing để query giá
                     không phải join qua trades/listings — bảng an toàn để
                     public/export cho AI.

ratings (P2)      id, trade_id→trades, rater_id→users, ratee_id→users,
                  score(1–5), comment?, created_at, updated_at
                  unique(trade_id, rater_id) — mỗi bên 1 lần/trade
                  "revealed" = trade đủ 2 rating (derived, không lưu)

reports (P2)      id, reporter_id→users, reported_user_id→users,
                  listing_id?→listings, reason(10–500 ký tự),
                  status(pending|verified|dismissed, default pending) (P10),
                  resolved_at? (P10), created_at, updated_at
                  ── Hồ sơ công khai CHỈ hiện vi phạm status=verified; 🟡 cần
                     ≥2 NGƯỜI KHÁC NHAU đang pending (chống report bẩn).
                     Chưa có admin UI — duyệt tạm bằng tay ở DB.

comments (P3)     id, listing_id→listings, user_id→users, body(1–500 ký tự),
                  created_at, updated_at

favorites         id, user_id→users (cascade), listing_id?→listings (cascade),
                  buy_order_id?→buy_orders (cascade), created_at. Đúng 1 FK
                  listing/buy_order khác null. Unique (user,listing)+(user,buy_order).
                  Tin đã lưu ❤️ — xem [api/favorites.md](api/favorites.md).

purchase_requests id, listing_id→listings, buyer_id→users,
(P3)              status(pending|connected), created_at, updated_at
                  unique(listing_id, buyer_id)

email_tokens (P4) id, user_id→users, token(unique), type(verify|reset),
                  expires_at (verify 24h / reset 1h), used_at? (dùng 1 lần)

email_outbox (P4) hộp thư dev — chỉ dùng khi chưa cấu hình SMTP (xem email.md)

rate_limits       key (PK, dạng "action:loại:định danh"), count, window_end
                  ── KHÔNG có FK tới users: key là chuỗi tự do nên chặn được cả
                     người chưa đăng nhập (theo IP/email). Tăng bằng 1 câu
                     INSERT…ON CONFLICT atomic — nhiều instance Vercel chạy
                     song song, đọc-rồi-ghi ở tầng app sẽ đếm thiếu.
                     Dọn lazy (không cần cron). Xem docs/api/auth.md.
```

## Giá trị enum quan trọng

- `condition` thẻ lẻ: `PSA10 | PSA9 | BGS95 | RAW_NM | RAW_LP | RAW_MP | RAW_HP | DAMAGED`; BOX: `BOX_SHRINK | BOX_NO_SHRINK`. **Condition phải khớp `category` của card** → `400 CONDITION_MISMATCH`.
- `listings.status`: `active → in_trade` (có trade pending) `→ closed` (trade chốt); `cancelled` (chủ hủy) — hủy trade pending thì mở lại `active`.
- `trades.status`: `pending → confirmed | self_reported | cancelled`.

## Giá trị derived (KHÔNG lưu cột)

- `contributionCount` của user = COUNT(trades WHERE status IN (confirmed, self_reported) AND user là buyer/seller).
- `revealed` của rating = trade có đủ 2 rating.
- `ratingAvg` của user = trung bình score các rating **đã reveal** nhận được; null nếu chưa có.
- **XP / level / tier / trustScore / badge / safety (P10)** — toàn bộ derived từ lịch sử tại thời điểm xem, không có bảng sự kiện XP (không farm được bằng hành động lặp). Công thức: `src/server/services/profile-service.ts`; ngữ nghĩa: [api/ratings-reports-users.md](api/ratings-reports-users.md).

## Seed (`prisma/seed.ts`)

5 users (verified + đã accept terms sẵn — demo không bị chặn), ~38 thẻ + 8 box, 10 listing active, 66 price records. Idempotent (`npm run db:seed`). **Nhớ sync `TERMS_VERSION` hardcode trong seed khi đổi version** (xem [business-rules.md](business-rules.md)).

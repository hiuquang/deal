# Favorites (tin đã lưu ❤️)

User lưu listing hoặc buy-order để xem lại ở trang cá nhân. Cần đăng nhập (không lưu ẩn danh). Bảng `favorites` — đúng 1 trong 2 FK (`listing_id` / `buy_order_id`) khác null; 2 unique `(user_id, listing_id)` + `(user_id, buy_order_id)` chặn trùng (NULL distinct trong Postgres nên không cản nhau).

| Method | Endpoint | Body | Trả về |
|---|---|---|---|
| GET | `/api/favorites` | — | `{items: SavedItem[]}` — danh sách đầy đủ (trang cá nhân) |
| GET | `/api/favorites/ids` | — | `{listingIds, buyOrderIds}` — tô tim đầy/rỗng trên thẻ (1 request/trang) |
| POST | `/api/favorites` | `{kind: "listing"｜"buy_order", id, favorited: bool}` | `{favorited}` |

- `POST` idempotent theo hướng: `favorited:true` upsert (đã lưu thì thôi), `favorited:false` delete. Lưu tin không tồn tại → `404 NOT_FOUND`; **bỏ lưu KHÔNG check tồn tại** (tin có thể đã bị xóa).
- `SavedItem`: `{kind, targetId, cardNameJa, imageUrl, priceJpy, available, savedAt}`. `available=false` khi tin `status != active` (đã bán/gỡ/hủy) hoặc bị xóa cứng (khi đó `targetId=null`) → UI hiện "sản phẩm này không còn", vẫn cho bỏ lưu.
- Client: `FavoritesProvider` tải `/ids` 1 lần khi đăng nhập, cho `HeartButton` tô trạng thái + toggle optimistic (revert nếu API lỗi) — tránh mỗi thẻ tự gọi API.

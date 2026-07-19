/**
 * Header cache CDN cho các GET CÔNG KHAI (response giống hệt nhau với mọi
 * người xem — TUYỆT ĐỐI không dùng cho response cá nhân hóa như mine=1).
 *
 * Lý do tồn tại: function + DB ghim ở Sydney (sát nhau) nhưng user ở Nhật —
 * mỗi request công khai phải vòng Tokyo→Sydney (~+250–400ms). `s-maxage` để
 * edge Vercel (có PoP Tokyo) cache và phục vụ tại chỗ; `stale-while-revalidate`
 * trả bản cũ ngay rồi làm mới ngầm — độ trễ cảm nhận ~50ms cho lượt sau.
 * Cache theo URL đầy đủ (gồm query) nên mỗi bộ lọc là 1 entry riêng.
 */
export const PUBLIC_LIST_CACHE = {
  // Bảng tin đổi khi có tin mới — chấp nhận cũ tối đa 15s.
  "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
} as const;

export const PUBLIC_CATALOG_CACHE = {
  // Catalog gần như tĩnh (thêm thẻ mới là hiếm) — cache dài hơn.
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
} as const;

/** Response cá nhân hóa — cấm mọi tầng cache đụng vào. */
export const PRIVATE_NO_STORE = {
  "Cache-Control": "private, no-store",
} as const;

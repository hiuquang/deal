import type { MetadataRoute } from "next";
import * as listingService from "@/server/services/listing-service";
import * as buyOrderService from "@/server/services/buy-order-service";
import { siteUrl } from "@/lib/site";

// Sitemap để Google biết từng tin đăng tồn tại — chợ mới không có backlink nào,
// không khai báo thì crawler chỉ thấy mỗi trang chủ.
// Cache 1 giờ: tin mới không cần vào index tức thì, mà mỗi lượt build sitemap
// là vài chục truy vấn xuống Supabase.
export const revalidate = 3600;

// Chặn trên số trang phải quét (20 tin/trang). Chợ còn nhỏ nên dư sức phủ hết;
// nếu vượt thì thà thiếu vài tin cũ còn hơn quét vô hạn xuống DB.
const MAX_PAGES = 50;

/** Gom mọi trang của một danh sách phân trang cho tới khi hết hoặc chạm trần. */
async function collectAll<T>(
  fetchPage: (page: number) => Promise<{ items: T[]; total: number }>
): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { items, total } = await fetchPage(page);
    out.push(...items);
    if (out.length >= total || items.length === 0) break;
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const staticPages: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const [listings, buyOrders] = await Promise.all([
      collectAll(async (page) => {
        const r = await listingService.list({ status: "active", page });
        return { items: r.listings, total: r.total };
      }),
      collectAll(async (page) => {
        const r = await buyOrderService.list({ status: "active", page });
        return { items: r.buyOrders, total: r.total };
      }),
    ]);

    // Trang giá lấy từ chính các thẻ đang có tin — thẻ không ai đăng thì trang
    // giá của nó rỗng, đưa vào sitemap chỉ tổ dính "thin content".
    const cardIds = new Set([
      ...listings.map((l) => l.card.id),
      ...buyOrders.map((o) => o.card.id),
    ]);

    return [
      ...staticPages,
      ...listings.map((l) => ({
        url: `${base}/listings/${l.id}`,
        lastModified: new Date(l.createdAt),
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
      ...buyOrders.map((o) => ({
        url: `${base}/buy-orders/${o.id}`,
        lastModified: new Date(o.createdAt),
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
      ...[...cardIds].map((id) => ({
        url: `${base}/prices/${id}`,
        changeFrequency: "daily" as const,
        priority: 0.6,
      })),
    ];
  } catch (e) {
    // DB lỗi → vẫn trả sitemap tối thiểu. Ném ra là Google nhận 500 và có thể
    // bỏ luôn sitemap một thời gian.
    console.error("[sitemap] không dựng được danh sách tin:", e);
    return staticPages;
  }
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import * as listingService from "@/server/services/listing-service";
import { formatJpy } from "@/lib/labels";
import { MESSAGES } from "@/lib/messages";
import { absoluteUrl } from "@/lib/site";
import { ListingDetail } from "./listing-detail";

// Trang chi tiết tin bán server-render. Trước v0.27.0 đây là client component
// fetch trong useEffect → bộ quét của Google và của Facebook/Zalo chỉ thấy
// trang rỗng, nên không tin nào index được và link dán vào group không có
// preview. Đó là hai đường vào người dùng tự nhiên duy nhất của chợ.
const getListing = cache(async (id: string) => {
  try {
    return await listingService.getById(id);
  } catch {
    // getById ném ApiError 404 khi không thấy; mọi lỗi khác cũng không có gì
    // để hiện ở trang công khai → 404 chuẩn thay vì màn hình lỗi.
    return null;
  }
});

// Metadata (chạy trước) và page cùng gọi getListing — `cache` gộp lại 1 truy vấn.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return { title: "Không tìm thấy tin đăng — DEAL" };

  const price = listing.askingPriceJpy
    ? formatJpy(listing.askingPriceJpy)
    : MESSAGES["common.negotiable"].vi;
  const title = `${listing.card.nameJa} — ${price} | DEAL`;
  // Metadata luôn tiếng Việt (khớp <html lang="vi">): locale là lựa chọn phía
  // client, bộ quét link không mang theo được.
  const description = [
    MESSAGES[`cond.${listing.condition}`].vi,
    price,
    listing.station ? `📍 ${listing.station}` : null,
    "Trade trực tiếp giữa người chơi, phí 0%.",
  ]
    .filter(Boolean)
    .join(" · ");
  const image = absoluteUrl(listing.imageUrl);

  return {
    title,
    description,
    alternates: { canonical: `/listings/${listing.id}` },
    openGraph: {
      type: "article",
      // Next THAY cả khối openGraph của layout chứ không trộn từng khóa —
      // không lặp lại siteName/locale ở đây là trang chi tiết mất hai thẻ đó.
      siteName: "DEAL",
      locale: "vi_VN",
      url: `/listings/${listing.id}`,
      title,
      description,
      images: [{ url: image, alt: listing.card.nameJa }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
    // Tin đã gỡ/đã bán vẫn xem được qua link cũ nhưng không nên nằm trong kết
    // quả tìm kiếm — người tìm thấy nó chỉ gặp ngõ cụt.
    robots: listing.status === "active" ? undefined : { index: false, follow: true },
  };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();

  return <ListingDetail initial={listing} />;
}

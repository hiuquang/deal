import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import * as buyOrderService from "@/server/services/buy-order-service";
import { formatJpy } from "@/lib/labels";
import { MESSAGES } from "@/lib/messages";
import { absoluteUrl } from "@/lib/site";
import { BuyOrderDetail } from "./buy-order-detail";

// Server-render vì lý do giống trang tin bán: cho Google index được và cho
// link dán vào group có preview. Xem `listings/[id]/page.tsx`.
const getBuyOrder = cache(async (id: string) => {
  try {
    return await buyOrderService.getById(id);
  } catch {
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const order = await getBuyOrder(id);
  if (!order) return { title: "Không tìm thấy tin đăng mua — DEAL" };

  const wants = MESSAGES["bo.wants"].vi.replace("{n}", String(order.quantity));
  const title = `${MESSAGES["bon.title"].vi}: ${order.card.nameJa} — ${wants} | DEAL`;
  const description = [
    wants,
    order.maxUnitPriceJpy
      ? MESSAGES["bo.maxUnit"].vi.replace("{price}", formatJpy(order.maxUnitPriceJpy))
      : MESSAGES["bo.noMaxPrice"].vi,
    "Có thẻ này? Chào bán ngay trên DEAL, phí 0%.",
  ].join(" · ");
  // Tin đăng mua có thể không kèm ảnh → rơi về ảnh mặc định của site.
  const image = order.imageUrl ? absoluteUrl(order.imageUrl) : absoluteUrl("/logo.jpg");

  return {
    title,
    description,
    alternates: { canonical: `/buy-orders/${order.id}` },
    openGraph: {
      type: "article",
      // Xem chú thích ở `listings/[id]/page.tsx`: openGraph không được trộn.
      siteName: "DEAL",
      locale: "vi_VN",
      url: `/buy-orders/${order.id}`,
      title,
      description,
      images: [{ url: image, alt: order.card.nameJa }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
    robots: order.status === "active" ? undefined : { index: false, follow: true },
  };
}

export default async function BuyOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getBuyOrder(id);
  if (!order) notFound();

  return <BuyOrderDetail initial={order} />;
}

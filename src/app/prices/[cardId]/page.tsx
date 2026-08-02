import type { Metadata } from "next";
import { cache } from "react";
import * as cardService from "@/server/services/card-service";
import { cardSpec, cardTitle } from "@/lib/labels";
import { PricesView } from "./prices-view";

// Server component chỉ để sinh metadata. Không có nó thì MỌI trang giá dùng
// chung đúng một title của layout — trùng lặp hàng loạt là thứ Google phạt,
// mà trang giá lại là nội dung dễ lên tìm kiếm nhất của DEAL (người ta search
// thẳng tên thẻ + giá). Nội dung vẫn do client tải, xem chú thích ở PricesView.
const getCard = cache(async (id: string) => {
  try {
    return await cardService.getById(id);
  } catch {
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cardId: string }>;
}): Promise<Metadata> {
  const { cardId } = await params;
  const card = await getCard(cardId);
  if (!card) return { title: "Không tìm thấy sản phẩm — DEAL" };

  const title = `Giá ${cardTitle(card)} | DEAL`;
  const description = [
    `Dữ liệu giá giao dịch thật của ${card.nameJa}`,
    cardSpec(card),
    "trên DEAL — chợ trade thẻ TCG phí 0%.",
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    title,
    description,
    alternates: { canonical: `/prices/${card.id}` },
    openGraph: {
      type: "article",
      siteName: "DEAL",
      locale: "vi_VN",
      url: `/prices/${card.id}`,
      title,
      description,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PricesPage({
  params,
}: {
  params: Promise<{ cardId: string }>;
}) {
  const { cardId } = await params;
  // Không notFound() ở đây: PricesView tự hiện thông báo "không tìm thấy" theo
  // ngôn ngữ đang chọn, và card id sai vẫn cần trang có bố cục bình thường.
  return <PricesView cardId={cardId} />;
}

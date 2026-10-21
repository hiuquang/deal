import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  DIRECTORY_CHECKED_ON,
  KAITORI_REGIONS,
  REGION_LABEL,
  featuredShops,
  isKaitoriRegion,
  shopOfHandle,
  type KaitoriRegion,
  type KaitoriShop,
} from "@/lib/kaitori-shops";
import * as kaitoriPostsService from "@/server/services/kaitori-posts-service";
import { XPostEmbeds, type EmbedPost } from "@/components/x-post-embeds";

// ISR 10 phút: bài chỉ đổi 4 tiếng/lần (và cron gọi revalidatePath ngay sau
// mỗi lượt), nên không cần truy vấn DB cho từng lượt xem. Mốc 10 phút chỉ để
// bài quá 48 giờ rơi khỏi trang đúng hạn kể cả khi lịch quét chết.
export const revalidate = 600;
// Chỉ đúng hai vùng; /kaitori/abc → 404 thay vì dựng trang rỗng.
export const dynamicParams = false;

export function generateStaticParams() {
  return KAITORI_REGIONS.map((region) => ({ region }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  if (!isKaitoriRegion(region)) return {};
  const title = `買取 ${REGION_LABEL[region]} — 5 shop thu thẻ + bảng giá mới trên X | DEAL`;
  const description = `Shop thu thẻ Pokémon, One Piece ở ${REGION_LABEL[region]} và bài bảng giá 買取 họ đăng trên X trong 2 ngày qua.`;
  return {
    title,
    description,
    alternates: { canonical: `/kaitori/${region}` },
    openGraph: {
      type: "website",
      siteName: "DEAL",
      locale: "vi_VN",
      url: `/kaitori/${region}`,
      title,
      description,
      images: [{ url: "/logo.jpg", width: 1280, height: 470, alt: "DEAL" }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

const TIME_JST = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Tokyo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function ShopTile({ shop, region }: { shop: KaitoriShop; region: KaitoriRegion }) {
  const places = shop.branches[region]?.places ?? [];
  const primary = shop.links[0];
  return (
    <li className="w-[68%] shrink-0 snap-start sm:w-[42%] lg:w-auto">
      <a
        href={primary.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand-500"
      >
        <span className="text-lg font-bold text-slate-900">{shop.nameJa}</span>
        <span className="text-xs text-slate-400">{shop.nameLatin}</span>
        <span className="mt-2 flex-1 text-sm text-slate-600">
          {places.length > 0 ? places.join(" / ") : "Gửi thẻ qua bưu điện"}
        </span>
        <span className="mt-3 text-sm font-bold text-brand-600">{primary.label} ↗</span>
      </a>
    </li>
  );
}

export default async function KaitoriRegionPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region } = await params;
  if (!isKaitoriRegion(region)) notFound();

  const shops = featuredShops(region);

  // DB lỗi (hoặc lúc build chưa có bảng) → vẫn hiện hàng shop; mục bài đăng
  // rơi về trạng thái "chưa có bài". Hàng shop là dữ liệu tĩnh, không được chết
  // theo phần phụ.
  let data: kaitoriPostsService.RegionPosts = { posts: [], updatedAt: null };
  try {
    data = await kaitoriPostsService.listForRegion(region);
  } catch (e) {
    console.error("[kaitori] không đọc được bài đăng:", e);
  }

  const posts: EmbedPost[] = data.posts.map((p) => ({
    postId: p.postId,
    handle: p.handle,
    shopName: shopOfHandle(p.handle)?.nameJa ?? p.handle,
    timeLabel: TIME_JST.format(p.postedAt),
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-black text-slate-900">
          買取 <span className="text-brand-600">· {REGION_LABEL[region]}</span>
        </h1>
        <nav aria-label="Chọn khu vực" className="flex gap-1 rounded-full bg-slate-100 p-1 text-sm">
          {KAITORI_REGIONS.map((r) => (
            <Link
              key={r}
              href={`/kaitori/${r}`}
              aria-current={r === region ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 font-medium ${
                r === region ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {REGION_LABEL[r]}
            </Link>
          ))}
        </nav>
      </header>

      {/* Hàng ngang: điện thoại vuốt ngang (khung tự cuộn, trang không cuộn
          ngang), từ lg thì đủ chỗ cho 5 cột. overscroll-x-contain để vuốt hết
          hàng không kéo theo cử chỉ "quay lại" của trình duyệt. */}
      <section aria-label="Shop thu thẻ">
        {/* scroll-px-4 phải đi cùng px-4: thiếu nó, snap-start kéo thẻ đầu
            dính sát mép màn hình (lệch đúng 16px, đã đo). */}
        <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
          {shops.map((shop) => (
            <ShopTile key={shop.id} shop={shop} region={region} />
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-black text-slate-900">Bài 買取 mới trên X</h2>
          <p className="mt-1 text-xs text-slate-400">
            Cập nhật 4 tiếng/lần · bài quá 2 ngày tự ẩn
            {data.updatedAt && <> · lần gần nhất {TIME_JST.format(data.updatedAt)}</>}
          </p>
        </div>

        {posts.length > 0 ? (
          <XPostEmbeds posts={posts} />
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Chưa có bài 買取 nào trong 2 ngày qua. Bấm vào shop ở trên để xem bảng giá trên trang của họ.
          </p>
        )}
      </section>

      <p className="text-xs leading-relaxed text-slate-400">
        DEAL không liên kết và không nhận hoa hồng từ các shop trên. Bài đăng hiện bằng khung nhúng
        chính thức của X — nội dung do shop đăng, DEAL không lưu lại. Danh bạ soát ngày{" "}
        {DIRECTORY_CHECKED_ON}.
      </p>
    </div>
  );
}

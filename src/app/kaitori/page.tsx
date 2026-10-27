import type { Metadata } from "next";
import Link from "next/link";
import { KAITORI_FOCUS, KAITORI_REGIONS, REGION_EMOJI, REGION_HINT, REGION_LABEL, type KaitoriRegion } from "@/lib/kaitori-shops";
import { NEWS_CHECKED_ON, NEWS_ON_PAGE, latestNews, type PokemonNews } from "@/lib/kaitori-news";
import * as kaitoriPostsService from "@/server/services/kaitori-posts-service";

// ISR 10 phút như trang vùng: thẻ chọn vùng hiện "giá cao nhất hôm nay" lấy từ
// DB, đổi theo bài trên X. Trước đây trang này tĩnh hoàn toàn.
export const revalidate = 600;

/** "2026-10-16" → "16/10/2026" — định dạng tay, không qua Intl (khỏi lệch múi giờ). */
function viDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// Cửa vào: chỉ chọn vùng. Nội dung thật ở /kaitori/[vùng] — tách route chứ
// không dùng ?region= để mỗi vùng là một trang tĩnh riêng (ISR), link dán vào
// group dẫn thẳng tới đúng vùng, và Google thấy hai trang thay vì một.
const TITLE = "買取 — Shop thu thẻ ở Tokyo và Osaka | DEAL";
const DESC =
  "Chọn khu vực để xem các shop thu thẻ TCG (買取) và bảng giá 買取 mới nhất họ đăng trên X, kèm tin chính thức có thể làm giá Pokémon Card biến động.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/kaitori" },
  // `openGraph` của trang con THAY cả khối của layout → lặp lại siteName + locale.
  openGraph: {
    type: "website",
    siteName: "DEAL",
    locale: "vi_VN",
    url: "/kaitori",
    title: TITLE,
    description: DESC,
    images: [{ url: "/logo.jpg", width: 1280, height: 470, alt: "DEAL" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

/** Nền thẻ chọn vùng — mỗi vùng một màu để nhìn là phân biệt. */
const REGION_CARD: Record<KaitoriRegion, string> = {
  tokyo: "from-brand-700 via-brand-600 to-brand-500",
  osaka: "from-gold-600 via-gold-500 to-gold-400",
};

/** Màu nhãn tin theo chiều tác động lên giá. */
const TONE: Record<PokemonNews["tone"], string> = {
  down: "bg-rose-50 text-rose-700 ring-rose-200",
  up: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  watch: "bg-amber-50 text-amber-800 ring-amber-200",
};
const TONE_ARROW: Record<PokemonNews["tone"], string> = { down: "↘", up: "↗", watch: "◎" };

async function topPriceOf(region: KaitoriRegion): Promise<{ price: string; card: string | null } | null> {
  try {
    const { posts } = await kaitoriPostsService.listForRegion(region);
    const top = posts[0];
    return top?.topPriceJpy ? { price: `¥${top.topPriceJpy.toLocaleString("ja-JP")}`, card: top.topCard } : null;
  } catch {
    return null; // DB lỗi → thẻ vùng vẫn hiện, chỉ thiếu dòng giá
  }
}

export default async function KaitoriRegionChooser() {
  const tops = await Promise.all(KAITORI_REGIONS.map(topPriceOf));

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-3xl font-black text-slate-900">買取</h1>
        <p className="mt-1 text-slate-500">Bán thẻ cho shop ở đâu được giá? Chọn khu vực của bạn.</p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {KAITORI_REGIONS.map((region, i) => (
          <li key={region}>
            <Link
              href={`/kaitori/${region}`}
              className={`group relative block overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl ${REGION_CARD[region]}`}
            >
              <span aria-hidden className="pointer-events-none absolute -right-3 -top-4 select-none text-[6.5rem] leading-none opacity-25 transition group-hover:scale-110">
                {REGION_EMOJI[region]}
              </span>
              <span className="block text-2xl font-black">{REGION_LABEL[region]}</span>
              <span className="mt-0.5 block text-sm text-white/80">{REGION_HINT[region]}</span>
              <span className="mt-6 block min-h-[3.25rem]">
                {tops[i] ? (
                  <>
                    <span className="block text-xs font-medium uppercase tracking-wide text-white/70">Giá thu {KAITORI_FOCUS} cao nhất 48h</span>
                    <span className="block text-2xl font-black tabular-nums">{tops[i]!.price}</span>
                    {tops[i]!.card && <span className="block truncate text-xs text-white/80">{tops[i]!.card}</span>}
                  </>
                ) : (
                  <span className="block text-sm text-white/80">Shop thu thẻ · bảng giá mới trên X</span>
                )}
              </span>
              <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold backdrop-blur transition group-hover:bg-white group-hover:text-slate-900">
                Xem shop →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Đặt SAU hai thẻ chọn vùng: việc chính của trang vẫn là chọn vùng,
          tin là thứ đọc thêm. Thẻ tin chỉ để lộ thứ đọc lướt được (nhãn, tiêu
          đề, một dòng ảnh hưởng); phần dài gập vào "Chi tiết". */}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xl font-black text-slate-900">📰 Tin có thể làm giá biến động</h2>
          <span className="shrink-0 text-xs text-slate-400">soát {viDate(NEWS_CHECKED_ON)}</span>
        </div>
        <ul className="space-y-3">
          {latestNews(NEWS_ON_PAGE).map((news) => (
            <li key={news.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2 text-xs">
                <span className={`rounded-full px-2.5 py-0.5 font-bold ring-1 ${TONE[news.tone]}`}>
                  {TONE_ARROW[news.tone]} {news.tag}
                </span>
                <span className="text-slate-400">{viDate(news.publishedOn)}</span>
              </div>
              <h3 className="mt-2 font-bold leading-snug text-slate-900">{news.title}</h3>
              {/* Hàng cuối: chữ bên trái, ảnh minh hoạ ở GÓC PHẢI CUỐI (yêu cầu
                  chủ web). items-end để ảnh bám đáy thẻ. */}
              <div className="mt-2 flex items-end justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed text-slate-600">{news.impact}</p>
                  <details className="group mt-2">
                    <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-sm font-medium text-brand-600 [&::-webkit-details-marker]:hidden">
                      Chi tiết <span aria-hidden className="transition group-open:rotate-180">▾</span>
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">{news.summary}</p>
                    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      {[news.source, ...(news.moreSources ?? [])].map((src, i) => (
                        <a
                          key={src.url}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="whitespace-nowrap font-medium text-brand-600 hover:underline"
                        >
                          {i === 0 ? "Nguồn" : "Xem thêm"}: {src.label} ↗
                        </a>
                      ))}
                    </p>
                  </details>
                </div>
                {news.imageFile && (
                  // Ảnh minh hoạ thuần trang trí (đồ vật chung chung, không
                  // phải ảnh sản phẩm) → alt rỗng để trình đọc màn hình bỏ qua.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={news.imageFile}
                    alt=""
                    width={96}
                    height={96}
                    loading="lazy"
                    className="h-20 w-20 shrink-0 rounded-xl sm:h-24 sm:w-24"
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

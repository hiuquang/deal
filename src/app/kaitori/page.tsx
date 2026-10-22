import type { Metadata } from "next";
import Link from "next/link";
import { KAITORI_REGIONS, REGION_HINT, REGION_LABEL } from "@/lib/kaitori-shops";
import { NEWS_CHECKED_ON, NEWS_ON_PAGE, latestNews } from "@/lib/kaitori-news";

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
  "Chọn khu vực để xem 5 shop thu thẻ TCG (買取) và bảng giá 買取 mới nhất họ đăng trên X, kèm tin chính thức có thể làm giá Pokémon Card biến động.";

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

export default function KaitoriRegionChooser() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-black text-slate-900">買取</h1>
        <p className="text-sm text-slate-500">Bạn ở khu vực nào?</p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {KAITORI_REGIONS.map((region) => (
          <li key={region}>
            <Link
              href={`/kaitori/${region}`}
              className="block rounded-2xl border-2 border-slate-200 bg-white p-6 transition hover:border-brand-500 hover:bg-brand-50/40 sm:p-8"
            >
              <span className="block text-2xl font-black text-slate-900">
                {REGION_LABEL[region]}
              </span>
              <span className="mt-1 block text-sm text-slate-500">{REGION_HINT[region]}</span>
              <span className="mt-4 block text-sm font-bold text-brand-600">Xem shop →</span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Đặt SAU hai thẻ chọn vùng: việc chính của trang vẫn là chọn vùng,
          tin là thứ đọc thêm. */}
      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-black text-slate-900">Tin có thể làm giá biến động</h2>
          <p className="mt-1 text-xs text-slate-400">
            Chỉ từ nguồn chính thức · soát ngày {viDate(NEWS_CHECKED_ON)}
          </p>
        </div>
        <ul className="space-y-3">
          {latestNews(NEWS_ON_PAGE).map((news) => (
            <li key={news.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-400">{viDate(news.publishedOn)}</p>
              <h3 className="mt-1 font-bold text-slate-900">{news.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{news.summary}</p>
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-900">
                <span className="font-bold">Ảnh hưởng tới giá: </span>
                {news.impact}
              </p>
              {/* Hàng cuối: link nguồn bên trái, ảnh minh hoạ ở GÓC PHẢI CUỐI
                  (yêu cầu chủ web). items-end để ảnh bám đáy thẻ dù link
                  xuống nhiều dòng. */}
              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {[news.source, ...(news.moreSources ?? [])].map((src, i) => (
                    <a
                      key={src.url}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      // nowrap: cạnh ảnh 96px trên điện thoại, link hẹp lại và
                      // "↗" rớt xuống dòng riêng trông như lỗi.
                      className="whitespace-nowrap font-medium text-brand-600 hover:underline"
                    >
                      {i === 0 ? "Nguồn" : "Xem thêm"}: {src.label} ↗
                    </a>
                  ))}
                </p>
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
                    className="h-24 w-24 shrink-0 rounded-xl"
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

import type { Metadata } from "next";
import Link from "next/link";
import { KAITORI_REGIONS, REGION_HINT, REGION_LABEL } from "@/lib/kaitori-shops";

// Cửa vào: chỉ chọn vùng. Nội dung thật ở /kaitori/[vùng] — tách route chứ
// không dùng ?region= để mỗi vùng là một trang tĩnh riêng (ISR), link dán vào
// group dẫn thẳng tới đúng vùng, và Google thấy hai trang thay vì một.
const TITLE = "買取 — Shop thu thẻ ở Tokyo và Osaka | DEAL";
const DESC =
  "Chọn khu vực để xem 5 shop thu thẻ TCG (買取) và bài bảng giá 買取 mới nhất họ đăng trên X.";

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
    </div>
  );
}

import type { Metadata, Viewport } from "next";
import { Noto_Sans } from "next/font/google";
import "./globals.css";

// Font hỗ trợ đầy đủ dấu tiếng Việt + Latin; chữ Nhật fallback về font hệ
// thống JP trong globals.css (nếu không khai báo, Windows lấy font Nhật
// làm chính → ký tự có dấu tiếng Việt bị lỗi hiển thị).
const notoSans = Noto_Sans({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-sans",
});
import { AuthProvider } from "@/components/auth-context";
import { FavoritesProvider } from "@/components/favorites-context";
import { I18nProvider } from "@/lib/i18n";
import { NavBar } from "@/components/nav-bar";
import { VerifyBanner } from "@/components/verify-banner";
import { TermsGate } from "@/components/terms-gate";
import { SiteFooter } from "@/components/site-footer";
import { BackBar } from "@/components/back-bar";

export const metadata: Metadata = {
  title: "DEAL — Trade thẻ TCG phí 0%",
  description:
    "Trade thẻ Pokémon và One Piece trực tiếp giữa người chơi với nhau. Phí 0%, dữ liệu giá minh bạch.",
  // PWA: bắt buộc để iPhone cho "Thêm vào màn hình chính" — mà đó lại là điều
  // kiện duy nhất để iOS cho phép thông báo đẩy (Safari trong tab thường KHÔNG
  // nhận push). Xem docs/push.md.
  manifest: "/manifest.webmanifest",
  applicationName: "DEAL",
  appleWebApp: { capable: true, title: "DEAL", statusBarStyle: "default" },
  // Next 15 chỉ phát thẻ chuẩn mới `mobile-web-app-capable`; iOS đời cũ chỉ đọc
  // thẻ có tiền tố `apple-`. Thiếu nó, "Thêm vào MH chính" trên iPhone cũ mở ra
  // tab Safari thường → KHÔNG nhận được thông báo đẩy. Khai tay để phủ cả hai.
  other: { "apple-mobile-web-app-capable": "yes" },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#16305c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={notoSans.variable}>
      <body className="min-h-screen antialiased">
        <I18nProvider>
          <AuthProvider>
            <FavoritesProvider>
              <NavBar />
              <VerifyBanner />
              <TermsGate />
              <main className="mx-auto max-w-5xl px-4 py-6">
                <BackBar />
                {children}
              </main>
              <SiteFooter />
            </FavoritesProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

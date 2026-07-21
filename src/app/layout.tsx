import type { Metadata } from "next";
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

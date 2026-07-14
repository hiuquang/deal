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
import { I18nProvider } from "@/lib/i18n";
import { NavBar } from "@/components/nav-bar";
import { VerifyBanner } from "@/components/verify-banner";
import { TermsGate } from "@/components/terms-gate";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "DEAL — 手数料ゼロのTCGトレード",
  description:
    "ポケモンカード・ワンピースカードをユーザー同士で直接取引。手数料ゼロ、透明な相場データ。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={notoSans.variable}>
      <body className="min-h-screen antialiased">
        <I18nProvider>
          <AuthProvider>
            <NavBar />
            <VerifyBanner />
            <TermsGate />
            <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
            <SiteFooter />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

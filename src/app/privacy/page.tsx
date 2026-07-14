import Link from "next/link";
import { TERMS_VERSION } from "@/lib/terms";

export const metadata = { title: "プライバシーポリシー | DEAL" };

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h2 className="text-base font-bold">{title}</h2>
    <div className="space-y-2 text-sm leading-relaxed text-slate-700">{children}</div>
  </section>
);

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-10">
      <header>
        <h1 className="text-2xl font-black">プライバシーポリシー</h1>
        <p className="mt-1 text-xs text-slate-400">バージョン {TERMS_VERSION}</p>
      </header>

      <Section title="1. 取得する情報">
        <ul className="list-disc space-y-1 pl-5">
          <li>アカウント情報: メールアドレス、表示名、パスワード（ハッシュ化して保存）</li>
          <li>取引情報: 出品内容、成約価格、取引日時、チャット・コメントの内容</li>
          <li>評価・通報の内容</li>
          <li>Cookie（ログイン状態の維持のためのセッションCookieのみ。広告目的のCookieは使用しません）</li>
        </ul>
      </Section>

      <Section title="2. 利用目的">
        <ul className="list-disc space-y-1 pl-5">
          <li>本サービスの提供・本人確認（メール確認、パスワード再設定）</li>
          <li>取引の成立・履歴管理、ユーザー間の信頼性表示（評価・取引実績）</li>
          <li>成約価格データの統計処理・相場情報の提供（個人を特定できない形式）</li>
          <li>不正行為の防止、通報への対応</li>
          <li>重要なお知らせの送信</li>
        </ul>
      </Section>

      <Section title="3. 第三者提供">
        <p>
          法令に基づく場合を除き、本人の同意なく個人情報を第三者に提供しません。個人情報を広告事業者等へ販売することはありません。
        </p>
      </Section>

      <Section title="4. 成約価格データの公開">
        <p>
          相場情報として公開されるのは<strong>成約価格・カード名・状態・成約日・信頼度ラベルのみ</strong>です。取引当事者のアカウント情報は公開データに一切含まれません（データベース設計上も紐付く個人情報カラムを持ちません）。
        </p>
      </Section>

      <Section title="5. 安全管理">
        <p>
          パスワードはbcryptによりハッシュ化して保存し、平文では保持しません。セッションはhttpOnly Cookieで管理します。
        </p>
      </Section>

      <Section title="6. 開示・訂正・削除">
        <p>
          ユーザーは、自己の個人情報の開示・訂正・削除を下記連絡先に請求できます。合理的な期間内に対応します（法令上保存が必要な情報を除く）。
        </p>
      </Section>

      <Section title="7. 改定">
        <p>
          本ポリシーを変更する場合、本サービス上で通知し、重要な変更については再同意を求めます。
        </p>
      </Section>

      <footer className="space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-500">
        <p>お問い合わせ: deal.tcg.jp@gmail.com</p>
        <p>
          関連:{" "}
          <Link href="/terms" className="text-indigo-600 hover:underline">
            利用規約
          </Link>
        </p>
      </footer>
    </article>
  );
}

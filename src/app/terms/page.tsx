import Link from "next/link";
import { TERMS_VERSION } from "@/lib/terms";

export const metadata = { title: "利用規約 | DEAL" };

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h2 className="text-base font-bold">{title}</h2>
    <div className="space-y-2 text-sm leading-relaxed text-slate-700">{children}</div>
  </section>
);

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-10">
      <header>
        <h1 className="text-2xl font-black">DEAL 利用規約</h1>
        <p className="mt-1 text-xs text-slate-400">バージョン {TERMS_VERSION}</p>
      </header>

      <Section title="第1条（本規約の適用）">
        <p>
          本規約は、DEAL運営者（以下「運営者」）が提供するトレーディングカード取引プラットフォーム「DEAL」（以下「本サービス」）の利用条件を定めるものです。ユーザーは、本規約に同意した上で本サービスを利用するものとします。
        </p>
      </Section>

      <Section title="第2条（サービスの性質 — 場の提供のみ）">
        <p>
          本サービスは、ユーザー同士がトレーディングカード等の取引相手を見つけるための<strong>「場」を提供するのみ</strong>であり、運営者は売買契約・交換契約の当事者にはなりません。
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>運営者は代金の預かり（エスクロー）、決済代行、商品の配送・検品を一切行いません。</li>
          <li>代金の支払い方法・商品の受け渡し方法は、当事者間の責任で決定・実行するものとします。</li>
          <li>出品物の真贋・状態・所有権について、運営者は一切保証しません。</li>
        </ul>
      </Section>

      <Section title="第3条（アカウント）">
        <ul className="list-disc space-y-1 pl-5">
          <li>登録にはメールアドレスの確認が必要です。1人につき1アカウントとします。</li>
          <li>未成年者は、親権者等の法定代理人の同意を得た上で利用するものとします。</li>
          <li>アカウントの管理責任はユーザー本人にあります。認証情報の使い回しは避けてください。</li>
        </ul>
      </Section>

      <Section title="第4条（禁止事項）">
        <p>ユーザーは、以下の行為をしてはなりません。</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>偽造品・盗品・法令で取引が禁止された物品の出品</li>
          <li>複数アカウントの作成、他人になりすます行為</li>
          <li>架空取引・自己取引等による成約価格データの操作</li>
          <li>他のユーザーへの誹謗中傷、詐欺、ハラスメント</li>
          <li>本サービス外への誘導を目的としたスパム行為</li>
          <li>法令または公序良俗に違反する行為</li>
        </ul>
        <p>
          違反が確認された場合、運営者は事前通知なくコンテンツの削除、アカウントの停止・削除を行うことができます。
        </p>
      </Section>

      <Section title="第5条（取引トラブル）">
        <p>
          取引に関する紛争（未着・未払い・状態相違・真贋等）は、<strong>当事者間で解決する</strong>ものとし、運営者は一切の責任を負いません。運営者は通報機能を通じて報告を受け付けますが、仲裁・補償の義務を負うものではありません。
        </p>
      </Section>

      <Section title="第6条（成約価格データの利用）">
        <p>
          ユーザーは、取引確定時に登録される成約価格・カード情報・状態・成約日等のデータが、
          <strong>個人を特定できない形で</strong>本サービス上での公開、統計処理、および価格分析（AIによる分析を含む）に利用されることに同意します。
        </p>
      </Section>

      <Section title="第7条（免責事項）">
        <ul className="list-disc space-y-1 pl-5">
          <li>本サービスは現状有姿で提供され、運営者はその完全性・正確性・可用性を保証しません。</li>
          <li>
            運営者は、本サービスの利用に起因してユーザーに生じた損害（取引トラブル、データ消失、逸失利益等を含む）について、運営者に故意または重過失がある場合を除き、一切の責任を負いません。
          </li>
          <li>相場データは参考情報であり、その正確性・将来の価格を保証するものではありません。</li>
        </ul>
      </Section>

      <Section title="第8条（サービスの変更・停止）">
        <p>
          運営者は、ユーザーへの事前通知なく本サービスの内容の変更、提供の中断・終了を行うことができます。
        </p>
      </Section>

      <Section title="第9条（規約の変更）">
        <p>
          運営者は本規約を変更できるものとします。変更後は、本サービス上で再同意を求め、同意をもって変更後の規約が適用されます。
        </p>
      </Section>

      <Section title="第10条（準拠法・裁判管轄）">
        <p>
          本規約は日本法に準拠し、本サービスに関して紛争が生じた場合、運営者の所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。
        </p>
      </Section>

      <footer className="space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-500">
        <p>お問い合わせ: deal.tcg.jp@gmail.com</p>
        <p>
          関連:{" "}
          <Link href="/privacy" className="text-indigo-600 hover:underline">
            プライバシーポリシー
          </Link>
        </p>
      </footer>
    </article>
  );
}

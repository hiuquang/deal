import Link from "next/link";
import { TERMS_VERSION } from "@/lib/terms";

export const metadata = { title: "Chính sách bảo mật | DEAL" };

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
        <h1 className="text-2xl font-black">Chính sách bảo mật</h1>
        <p className="mt-1 text-xs text-slate-400">Phiên bản {TERMS_VERSION}</p>
      </header>

      <Section title="1. Thông tin thu thập">
        <ul className="list-disc space-y-1 pl-5">
          <li>Thông tin tài khoản: địa chỉ email, tên hiển thị, mật khẩu (lưu dưới dạng đã băm).</li>
          <li>Thông tin giao dịch: nội dung tin đăng, giá đóng, thời điểm giao dịch, nội dung chat và bình luận.</li>
          <li>Nội dung đánh giá và báo cáo.</li>
          <li>Cookie (chỉ cookie phiên để duy trì đăng nhập; không dùng cookie cho mục đích quảng cáo).</li>
        </ul>
      </Section>

      <Section title="2. Mục đích sử dụng">
        <ul className="list-disc space-y-1 pl-5">
          <li>Cung cấp Dịch vụ và xác thực người dùng (xác nhận email, đặt lại mật khẩu).</li>
          <li>Ghi nhận giao dịch, quản lý lịch sử, hiển thị độ tin cậy giữa người dùng (đánh giá, số giao dịch).</li>
          <li>Xử lý thống kê dữ liệu giá đóng và cung cấp thông tin giá thị trường (dưới dạng ẩn danh).</li>
          <li>Phòng chống gian lận và xử lý báo cáo.</li>
          <li>Gửi các thông báo quan trọng.</li>
        </ul>
      </Section>

      <Section title="3. Cung cấp cho bên thứ ba">
        <p>
          Trừ khi pháp luật yêu cầu, chúng tôi không cung cấp thông tin cá nhân
          cho bên thứ ba khi chưa có sự đồng ý của người dùng. Chúng tôi không
          bán thông tin cá nhân cho các đơn vị quảng cáo.
        </p>
      </Section>

      <Section title="4. Công khai dữ liệu giá đóng">
        <p>
          Thông tin công khai như dữ liệu giá thị trường chỉ gồm{" "}
          <strong>
            giá đóng, tên thẻ, tình trạng, ngày giao dịch và nhãn độ tin cậy
          </strong>
          . Thông tin tài khoản của các bên giao dịch KHÔNG nằm trong dữ liệu
          công khai (thiết kế cơ sở dữ liệu cũng không có cột thông tin cá nhân
          gắn với bản ghi giá).
        </p>
      </Section>

      <Section title="5. An toàn dữ liệu">
        <p>
          Mật khẩu được băm bằng bcrypt và không bao giờ lưu ở dạng văn bản rõ.
          Phiên đăng nhập được quản lý bằng cookie httpOnly.
        </p>
      </Section>

      <Section title="6. Truy cập, chỉnh sửa, xóa dữ liệu">
        <p>
          Người dùng có thể yêu cầu truy cập, chỉnh sửa hoặc xóa thông tin cá
          nhân của mình qua địa chỉ liên hệ bên dưới. Chúng tôi sẽ xử lý trong
          thời gian hợp lý (trừ thông tin buộc phải lưu theo quy định pháp luật).
        </p>
      </Section>

      <Section title="7. Sửa đổi">
        <p>
          Khi thay đổi chính sách này, chúng tôi sẽ thông báo trên Dịch vụ và yêu
          cầu đồng ý lại đối với các thay đổi quan trọng.
        </p>
      </Section>

      <footer className="space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-500">
        <p>Liên hệ: deal.tcg.jp@gmail.com</p>
        <p>
          Liên quan:{" "}
          <Link href="/terms" className="text-indigo-600 hover:underline">
            Điều khoản sử dụng
          </Link>
        </p>
      </footer>
    </article>
  );
}

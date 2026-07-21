import Link from "next/link";
import { TERMS_VERSION } from "@/lib/terms";

export const metadata = { title: "Điều khoản sử dụng | DEAL" };

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
        <h1 className="text-2xl font-black">Điều khoản sử dụng DEAL</h1>
        <p className="mt-1 text-xs text-slate-400">Phiên bản {TERMS_VERSION}</p>
      </header>

      <Section title="Điều 1 (Phạm vi áp dụng)">
        <p>
          Điều khoản này quy định điều kiện sử dụng nền tảng giao dịch thẻ bài
          “DEAL” (sau đây gọi là “Dịch vụ”) do bên vận hành DEAL (sau đây gọi là
          “Bên vận hành”) cung cấp. Người dùng chỉ sử dụng Dịch vụ sau khi đã
          đồng ý với Điều khoản này.
        </p>
      </Section>

      <Section title="Điều 2 (Bản chất dịch vụ — chỉ cung cấp nơi kết nối)">
        <p>
          Dịch vụ <strong>chỉ cung cấp “nơi kết nối”</strong> để người dùng tìm
          được đối tác giao dịch thẻ bài; Bên vận hành KHÔNG phải là một bên
          trong hợp đồng mua bán hay trao đổi.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Bên vận hành không giữ tiền hộ (ký quỹ), không xử lý thanh toán, không giao hàng hay kiểm hàng.</li>
          <li>Cách thức thanh toán và giao nhận do các bên tự quyết định và tự thực hiện, tự chịu trách nhiệm.</li>
          <li>Bên vận hành không bảo đảm về tính thật/giả, tình trạng hay quyền sở hữu của sản phẩm đăng bán.</li>
        </ul>
      </Section>

      <Section title="Điều 3 (Tài khoản)">
        <ul className="list-disc space-y-1 pl-5">
          <li>Đăng ký cần xác nhận địa chỉ email. Mỗi người chỉ dùng một tài khoản.</li>
          <li>Người chưa thành niên chỉ sử dụng khi có sự đồng ý của người giám hộ hợp pháp.</li>
          <li>Người dùng tự chịu trách nhiệm quản lý tài khoản của mình; tránh dùng chung thông tin đăng nhập.</li>
        </ul>
      </Section>

      <Section title="Điều 4 (Các hành vi bị cấm)">
        <p>Người dùng không được thực hiện các hành vi sau:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Đăng bán hàng giả, hàng trộm cắp, hoặc vật phẩm bị pháp luật cấm giao dịch.</li>
          <li>Tạo nhiều tài khoản, mạo danh người khác.</li>
          <li>Thao túng dữ liệu giá đóng bằng giao dịch khống, tự giao dịch với chính mình.</li>
          <li>Phỉ báng, lừa đảo, quấy rối người dùng khác.</li>
          <li>Spam nhằm lôi kéo ra ngoài Dịch vụ.</li>
          <li>Hành vi vi phạm pháp luật hoặc trái đạo đức xã hội.</li>
        </ul>
        <p>
          Khi phát hiện vi phạm, Bên vận hành có thể xóa nội dung, tạm ngưng hoặc
          xóa tài khoản mà không cần báo trước.
        </p>
      </Section>

      <Section title="Điều 5 (Tranh chấp giao dịch)">
        <p>
          Các tranh chấp liên quan đến giao dịch (không nhận được hàng, chưa
          thanh toán, sai tình trạng, hàng thật/giả…) do{" "}
          <strong>các bên tự giải quyết với nhau</strong>; Bên vận hành không
          chịu bất kỳ trách nhiệm nào. Bên vận hành tiếp nhận phản ánh qua chức
          năng báo cáo nhưng không có nghĩa vụ hòa giải hay bồi thường.
        </p>
      </Section>

      <Section title="Điều 6 (Sử dụng dữ liệu giá đóng)">
        <p>
          Người dùng đồng ý rằng dữ liệu giá đóng, thông tin thẻ, tình trạng và
          ngày giao dịch được ghi nhận khi chốt giao dịch sẽ được{" "}
          <strong>ẩn danh (không thể truy ngược cá nhân)</strong> và dùng cho
          việc công khai trên Dịch vụ, xử lý thống kê và phân tích giá (bao gồm
          phân tích bằng AI).
        </p>
      </Section>

      <Section title="Điều 7 (Miễn trừ trách nhiệm)">
        <ul className="list-disc space-y-1 pl-5">
          <li>Dịch vụ được cung cấp “nguyên trạng”; Bên vận hành không bảo đảm tính đầy đủ, chính xác hay khả dụng.</li>
          <li>
            Trừ trường hợp Bên vận hành cố ý hoặc lỗi nghiêm trọng, Bên vận hành
            không chịu trách nhiệm với mọi thiệt hại phát sinh từ việc sử dụng
            Dịch vụ (bao gồm tranh chấp giao dịch, mất dữ liệu, mất lợi nhuận…).
          </li>
          <li>Dữ liệu giá chỉ mang tính tham khảo, không bảo đảm độ chính xác hay giá trong tương lai.</li>
        </ul>
      </Section>

      <Section title="Điều 8 (Thay đổi, tạm ngưng dịch vụ)">
        <p>
          Bên vận hành có thể thay đổi nội dung, tạm ngưng hoặc chấm dứt cung cấp
          Dịch vụ mà không cần báo trước cho người dùng.
        </p>
      </Section>

      <Section title="Điều 9 (Thay đổi điều khoản)">
        <p>
          Bên vận hành có thể sửa đổi Điều khoản này. Sau khi thay đổi, Dịch vụ
          sẽ yêu cầu người dùng đồng ý lại; điều khoản mới áp dụng kể từ khi
          người dùng đồng ý.
        </p>
      </Section>

      <Section title="Điều 10 (Luật áp dụng)">
        <p>
          Điều khoản này được điều chỉnh theo pháp luật hiện hành. Khi có tranh
          chấp liên quan đến Dịch vụ, các bên ưu tiên giải quyết bằng thương
          lượng thiện chí trước khi đưa ra cơ quan có thẩm quyền.
        </p>
      </Section>

      <footer className="space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-500">
        <p>Liên hệ: deal.tcg.jp@gmail.com</p>
        <p>
          Liên quan:{" "}
          <Link href="/privacy" className="text-indigo-600 hover:underline">
            Chính sách bảo mật
          </Link>
        </p>
      </footer>
    </article>
  );
}

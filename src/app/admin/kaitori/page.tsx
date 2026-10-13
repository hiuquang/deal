import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isOwner } from "@/server/session";
import { DEFAULT_SHOP_HANDLES } from "@/server/services/kaitori-service";
import { KaitoriAdmin } from "./kaitori-admin";

// Khu quản trị: không index, không theo link. robots.txt cũng chặn /admin —
// hai lớp, vì trang này tiêu tiền API thật khi bấm nút.
export const metadata: Metadata = {
  title: "Thu thập giá 買取 — DEAL",
  robots: { index: false, follow: false },
};

/**
 * BẮT BUỘC render theo từng request. Không có dòng này, lúc build mà
 * `OWNER_USER_ID` chưa được đặt thì `isOwner()` thoát sớm, không chạm cookie →
 * Next prerender trang thành 404 TĨNH. Sau đó dù có đặt env trên Vercel, chủ
 * web vẫn nhận đúng bản 404 đã nướng sẵn. Đã dính đúng ca này khi build thử.
 */
export const dynamic = "force-dynamic";

export default async function KaitoriAdminPage() {
  // notFound() chứ không phải màn hình "không có quyền": người lạ dò trúng URL
  // thì không có lý do gì để biết ở đây CÓ một trang họ không được vào.
  if (!(await isOwner())) notFound();
  return <KaitoriAdmin defaultHandles={DEFAULT_SHOP_HANDLES} />;
}

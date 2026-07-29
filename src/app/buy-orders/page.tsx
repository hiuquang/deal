import { redirect } from "next/navigation";

/**
 * Bảng tin đăng mua RIÊNG đã bị gỡ ở v0.23.0 — tin đăng mua giờ nằm chung
 * trang tìm kiếm (tab "Đăng mua"). Giữ route này để chuyển hướng: link cũ đã
 * chia sẻ ra ngoài, mục yêu thích và lịch sử trình duyệt của user vẫn trỏ vào
 * đây — trả 404 là làm hỏng thứ vốn đang chạy.
 *
 * Giữ nguyên q/game/category để link đã lọc không mất bộ lọc khi chuyển.
 */
export default async function BuyOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const params = new URLSearchParams({ type: "buy" });
  for (const key of ["q", "game", "category"] as const) {
    const value = first(sp[key]);
    if (value) params.set(key, value);
  }
  redirect(`/?${params.toString()}`);
}

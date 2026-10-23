/**
 * "3 giờ trước" — khoảng cách thời gian tiếng Việt cho thẻ bài 買取.
 *
 * Tính ở SERVER lúc dựng trang (ISR 10 phút) nên có thể lệch tối đa ~10 phút
 * — chấp nhận được cho bảng giá đổi theo ngày, và tránh lệch hydration nếu
 * tính ở client.
 */
export function agoVi(then: Date, now: Date): string {
  const min = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 60_000));
  if (min < 1) return "vừa đăng";
  if (min < 60) return `${min} phút trước`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  return d === 1 ? "hôm qua" : `${d} ngày trước`;
}

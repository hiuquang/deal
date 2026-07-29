/**
 * Chế độ TRƯNG BÀY tin đã bán (v0.26.0).
 *
 * Bối cảnh: web còn ít người dùng, tin bán xong biến mất ngay làm chợ trông
 * trống trơn như đã chết. Bật chế độ này thì tin ĐÃ BÁN vẫn nằm trên bảng tin
 * (xám + băng chéo đỏ "SOLD", dồn xuống cuối) để trang có sức sống và người mới
 * thấy được ở đây thật sự có giao dịch.
 *
 * TẮT bằng: đặt biến env `SHOW_SOLD_LISTINGS=off` trên Vercel rồi redeploy.
 * Chủ web tự làm được trong dashboard, không cần đụng code. Cố ý KHÔNG tự tắt
 * theo số người dùng — chủ web đã chốt là chỉ tắt khi ra lệnh.
 *
 * ⚠️ CHỈ `closed` (đã bán), KHÔNG bao gồm `cancelled` (chủ tin tự gỡ, không hề
 * bán được). Dán chữ SOLD lên tin bị gỡ là nói sai sự thật về thị trường.
 */

const TAT = ["off", "false", "0", "no"];

/** Mặc định BẬT — trạng thái chủ web muốn ở giai đoạn hiện tại. */
export function dangTrungBayTinDaBan(): boolean {
  const raw = process.env.SHOW_SOLD_LISTINGS?.trim().toLowerCase();
  return !(raw && TAT.includes(raw));
}

/**
 * Tập trạng thái tin được hiện trên bảng tin công khai.
 * Dùng chung cho API route và SSR trang chủ để hai đường không lệch nhau.
 */
export function trangThaiHienTrenCho(): string[] {
  return dangTrungBayTinDaBan() ? ["active", "closed"] : ["active"];
}

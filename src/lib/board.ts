/**
 * Kiểu + parser dùng chung cho bảng tìm kiếm.
 *
 * Để ở đây (KHÔNG phải trong board-filters.tsx) vì `page.tsx` là server
 * component: import từ một module `"use client"` thì mọi export biến thành
 * client reference, gọi trên server sẽ hỏng. tsc không bắt được lỗi đó.
 */

/**
 * Loại tin trên bảng tìm kiếm: "" = cả hai (mặc định), "sell" = tin bán,
 * "buy" = tin đăng mua. Trước v0.23.0 tin đăng mua nằm ở trang riêng
 * /buy-orders; giờ gộp chung vào tìm kiếm để không ai bỏ sót.
 */
export type BoardType = "" | "sell" | "buy";

/** Param URL rác → coi như không lọc, đừng để trang trắng. */
export function parseBoardType(raw: string | null | undefined): BoardType {
  return raw === "sell" || raw === "buy" ? raw : "";
}

/**
 * Khoá nhận dạng bộ lọc đã dùng cho lượt render SSR — client so khoá này để
 * biết có cần fetch lại ngay khi mount không. Server component tạo khoá, client
 * đối chiếu, nên hàm BẮT BUỘC ở module trung lập (đã từng để nhầm trong file
 * "use client" → SSR ném "Attempted to call boardKey() from the server", bị
 * catch nuốt, trang vẫn có tin nhờ client fetch nên nhìn ngoài y hệt chạy tốt).
 */
export function boardKey(q: string, game: string, category: string, boardType: string): string {
  return `${q}|${game}|${category}|${boardType}`;
}

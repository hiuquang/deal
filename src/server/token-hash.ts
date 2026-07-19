import { createHash } from "crypto";

/**
 * SHA-256 (hex) của một token bí mật — GIÁ TRỊ LƯU Ở DB thay cho token thô.
 *
 * Token thô (session cookie, link email) là 32 byte ngẫu nhiên = high-entropy,
 * nên KHÔNG cần bcrypt/salt như mật khẩu (mật khẩu low-entropy, phải làm chậm để
 * chống brute-force). SHA-256 một chiều, nhanh, đủ: nếu DB bị đọc trộm, kẻ tấn
 * công thấy hash cũng không đảo ngược ra token để mạo danh phiên/đổi mật khẩu.
 * Cùng độ dài 64 hex như token thô → không cần đổi schema cột `token`.
 */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

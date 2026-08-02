// URL gốc công khai của site. Dùng cho metadataBase (thẻ OG/Twitter BẮT BUỘC
// URL tuyệt đối — đường dẫn tương đối thì Facebook/Zalo bỏ qua ảnh) và cho
// sitemap. Cùng nguồn env với link trong email để không tồn tại hai "địa chỉ
// thật" lệch nhau; `src/server/mailer.ts` gọi lại hàm này.
export function siteUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

/**
 * Nối đường dẫn ảnh thành URL tuyệt đối. Ảnh tin đăng là URL Supabase Storage
 * đầy đủ khi bật storage, nhưng rơi về `/uploads/...` tương đối khi chưa bật
 * (xem docs/environment.md) — nhánh sau mà đưa thẳng vào og:image là mất ảnh.
 */
export function absoluteUrl(path: string): string {
  return /^https?:\/\//.test(path) ? path : new URL(path, siteUrl()).toString();
}

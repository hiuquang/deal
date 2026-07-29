import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy: chặn XSS tải script lạ, chặn nhúng iframe, chặn
 * form bắn dữ liệu ra domain khác. Next.js bơm inline script khi hydrate nên
 * script-src cần 'unsafe-inline' (không dùng nonce — nonce ép dynamic
 * rendering toàn site, mất static optimization). Dev thêm 'unsafe-eval' + ws:
 * cho HMR/Turbopack. Ảnh cho phép Supabase Storage (uploads) và blob:/data:
 * (preview ảnh phía client trước khi upload).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  // Service worker thông báo đẩy (/sw.js) + manifest PWA. worker-src fallback
  // về script-src nên vẫn chạy nếu thiếu, nhưng khai rõ để không vỡ khi sau này
  // siết script-src.
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // 2 năm HTTPS-only, áp dụng cả subdomain — trình duyệt từ chối HTTP từ lần ghé thứ 2.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Chặn trình duyệt đoán MIME type (không thể lừa chạy file upload như script).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Chặn clickjacking (dự phòng cho frame-ancestors với trình duyệt cũ).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // App không dùng camera/mic/GPS — tắt hẳn để iframe/script lạ không xin được.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

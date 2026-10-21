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
function buildCsp(extra: { script?: string[]; frame?: string[] } = {}): string {
  const script = ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : []), ...(extra.script ?? [])];
  return [
    "default-src 'self'",
    `script-src ${script.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self' data:",
    `connect-src 'self'${isDev ? " ws:" : ""}`,
    // Không khai thì frame-src rơi về default-src 'self' như trước giờ.
    ...(extra.frame?.length ? [`frame-src 'self' ${extra.frame.join(" ")}`] : []),
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
}

const csp = buildCsp();

/**
 * NGOẠI LỆ DUY NHẤT: /kaitori/[vùng] nhúng bài X bằng widgets.js chính thức —
 * script ở platform.twitter.com, bài vẽ trong iframe cùng domain. Chỉ nới cho
 * đúng route đó; trang có form/chat/đăng nhập vẫn giữ CSP chặt. Chữ, ảnh trong
 * bài nằm TRONG iframe nên chịu CSP của X, không cần mở img-src ở đây.
 */
const kaitoriCsp = buildCsp({
  script: ["https://platform.twitter.com"],
  frame: ["https://platform.twitter.com", "https://syndication.twitter.com"],
});

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
    return [
      { source: "/:path*", headers: securityHeaders },
      // Khai SAU: cùng khóa header thì Next lấy rule sau cùng → chỉ CSP bị thay,
      // các header bảo mật khác của rule trên vẫn giữ.
      { source: "/kaitori/:region", headers: [{ key: "Content-Security-Policy", value: kaitoriCsp }] },
    ];
  },
};

export default nextConfig;

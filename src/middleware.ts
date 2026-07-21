import { NextRequest, NextResponse } from "next/server";

/**
 * Chống CSRF lớp 2 cho mọi request GHI vào /api (lớp 1 là cookie
 * sameSite=lax — trình duyệt không gửi cookie khi POST từ site khác).
 *
 * Quy tắc: request có header Origin (mọi trình duyệt đều gửi khi POST) mà
 * origin không khớp host đang phục vụ → 403. Request không có Origin
 * (curl, test, server-to-server) cho qua — các client đó không mang cookie
 * nạn nhân nên không phải CSRF.
 */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function middleware(req: NextRequest) {
  if (SAFE_METHODS.has(req.method)) return NextResponse.next();

  const origin = req.headers.get("origin");
  if (!origin) return NextResponse.next();

  // Vercel đặt host công khai vào x-forwarded-host; dev local dùng host.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (host && new URL(origin).host === host) return NextResponse.next();
  } catch {
    // Origin không parse được → coi như lạ, rơi xuống 403
  }

  return NextResponse.json(
    { error: { code: "FORBIDDEN", message: "Nguồn yêu cầu không hợp lệ.", details: null } },
    { status: 403 }
  );
}

export const config = { matcher: "/api/:path*" };

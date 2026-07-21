import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** Lỗi nghiệp vụ có mã — mọi service throw loại này, route handler dịch ra JSON. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const unauthorized = () =>
  new ApiError(401, "UNAUTHORIZED", "Bạn cần đăng nhập.");

export function errorToResponse(e: unknown): NextResponse {
  if (e instanceof ApiError) {
    return NextResponse.json(
      { error: { code: e.code, message: e.message, details: e.details ?? null } },
      { status: e.status }
    );
  }
  if (e instanceof ZodError) {
    const first = e.issues[0];
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION",
          message: `${first?.path.join(".") || "input"}: ${first?.message || "invalid"}`,
          details: null,
        },
      },
      { status: 400 }
    );
  }
  console.error("[api] unexpected error:", e);
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "Đã xảy ra lỗi máy chủ.", details: null } },
    { status: 500 }
  );
}

/** Bọc route handler: bắt ApiError/ZodError và trả JSON lỗi thống nhất. */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (e) {
      return errorToResponse(e);
    }
  };
}

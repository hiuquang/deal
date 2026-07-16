import { expect } from "vitest";
import { ApiError } from "@/server/errors";

/** Khẳng định promise reject bằng ApiError có mã lỗi (và status nếu truyền) mong đợi. */
export async function expectApiError(promise: Promise<unknown>, code: string, status?: number) {
  try {
    await promise;
    expect.fail(`expected ApiError ${code}`);
  } catch (e) {
    expect(e).toBeInstanceOf(ApiError);
    expect((e as ApiError).code).toBe(code);
    if (status !== undefined) {
      expect((e as ApiError).status).toBe(status);
    }
  }
}

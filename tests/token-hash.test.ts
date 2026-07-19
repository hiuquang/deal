import { describe, expect, it } from "vitest";
import { hashToken } from "@/server/token-hash";

describe("hashToken", () => {
  it("cùng input → cùng hash (tra cứu DB khớp được)", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
  });

  it("input khác → hash khác", () => {
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });

  it("ra SHA-256 hex 64 ký tự (cùng độ dài token thô → không cần đổi cột)", () => {
    expect(hashToken("whatever")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("không trả lại token thô (một chiều)", () => {
    const raw = "supersecret-token";
    expect(hashToken(raw)).not.toContain(raw);
  });
});

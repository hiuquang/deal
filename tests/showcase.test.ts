/**
 * Test chế độ trưng bày tin đã bán:
 * - mặc định BẬT (không đặt env) — trạng thái chủ web muốn hiện tại
 * - nhận nhiều cách viết "tắt", không phân biệt hoa thường / khoảng trắng
 * - giá trị lạ KHÔNG được vô tình tắt tính năng
 * - TUYỆT ĐỐI không kèm "cancelled": tin bị gỡ không phải tin đã bán
 *
 * Module đọc env lúc gọi hàm nên chỉ cần stubEnv, không cần resetModules.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { dangTrungBayTinDaBan, trangThaiHienTrenCho } from "@/server/showcase";

afterEach(() => vi.unstubAllEnvs());

describe("dangTrungBayTinDaBan", () => {
  it("không đặt env → BẬT (mặc định)", () => {
    vi.stubEnv("SHOW_SOLD_LISTINGS", "");
    expect(dangTrungBayTinDaBan()).toBe(true);
  });

  it.each(["off", "OFF", " Off ", "false", "0", "no"])("%s → TẮT", (raw) => {
    vi.stubEnv("SHOW_SOLD_LISTINGS", raw);
    expect(dangTrungBayTinDaBan()).toBe(false);
  });

  it.each(["on", "true", "1", "bat", "xyz"])("%s → vẫn BẬT (không tắt nhầm)", (raw) => {
    vi.stubEnv("SHOW_SOLD_LISTINGS", raw);
    expect(dangTrungBayTinDaBan()).toBe(true);
  });
});

describe("trangThaiHienTrenCho", () => {
  it("bật → hiện tin đang bán + ĐÃ BÁN", () => {
    vi.stubEnv("SHOW_SOLD_LISTINGS", "");
    expect(trangThaiHienTrenCho()).toEqual(["active", "closed"]);
  });

  it("tắt → chỉ tin đang bán", () => {
    vi.stubEnv("SHOW_SOLD_LISTINGS", "off");
    expect(trangThaiHienTrenCho()).toEqual(["active"]);
  });

  it("KHÔNG BAO GIỜ kèm cancelled — tin bị gỡ không phải tin đã bán", () => {
    for (const raw of ["", "off", "on"]) {
      vi.stubEnv("SHOW_SOLD_LISTINGS", raw);
      expect(trangThaiHienTrenCho()).not.toContain("cancelled");
    }
  });
});

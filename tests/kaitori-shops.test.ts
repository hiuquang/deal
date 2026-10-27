/**
 * Test danh bạ shop 買取 — dữ liệu TĨNH nên test ở đây là test QUY TẮC: mỗi
 * dòng tương ứng một lời hứa trang /kaitori/[vùng] đưa ra (đúng 6 shop, link
 * chính thức kiểm được, không vùng nào rỗng) và một lời hứa với hóa đơn xAI
 * (chỉ quét handle có trong danh bạ, không quét trùng, không vượt trần 20 của
 * X Search). Người sau thêm shop mà quên một điều thì test đỏ ngay.
 */
import { describe, expect, it } from "vitest";
import {
  DIRECTORY_CHECKED_ON,
  FEATURED_SHOP_IDS,
  KAITORI_REGIONS,
  KAITORI_SHOPS,
  allPostHandles,
  featuredShops,
  isKaitoriRegion,
  matchPostHandle,
  regionPostHandles,
  shopOfHandle,
  HANDLE_BRANCH,
  postSourceName,
} from "@/lib/kaitori-shops";

const HANDLE = /^[A-Za-z0-9_]{1,15}$/;

describe("danh bạ shop 買取", () => {
  it("id không trùng", () => {
    const ids = KAITORI_SHOPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("shop nào cũng có tên, cách đọc, ít nhất một dòng thẻ", () => {
    for (const shop of KAITORI_SHOPS) {
      expect(shop.nameJa.trim(), shop.id).not.toBe("");
      expect(shop.nameLatin.trim(), shop.id).not.toBe("");
      expect(shop.games.length, shop.id).toBeGreaterThan(0);
    }
  });

  it("shop nào cũng có link chính thức https — thẻ shop trỏ vào link đầu tiên", () => {
    for (const shop of KAITORI_SHOPS) {
      expect(shop.links.length, shop.id).toBeGreaterThan(0);
      for (const link of shop.links) {
        expect(link.label.trim(), shop.id).not.toBe("");
        expect(link.url, shop.id).toMatch(/^https:\/\//);
      }
    }
  });

  it("chi nhánh khai đúng vùng, có khu/ga, handle đúng dạng", () => {
    for (const shop of KAITORI_SHOPS) {
      for (const [region, branch] of Object.entries(shop.branches)) {
        expect(isKaitoriRegion(region), `${shop.id}: vùng lạ ${region}`).toBe(true);
        expect(branch!.places.length, `${shop.id}/${region}`).toBeGreaterThan(0);
        for (const h of branch!.xHandles) expect(h, shop.id).toMatch(HANDLE);
      }
      for (const h of shop.online?.xHandles ?? []) expect(h, shop.id).toMatch(HANDLE);
      if (shop.xHandle) expect(shop.xHandle, shop.id).toMatch(HANDLE);
    }
  });

  it("shop không chi nhánh nào thì phải là shop online — không thì trang hiện thẻ trống", () => {
    for (const shop of KAITORI_SHOPS) {
      const hasBranch = Object.keys(shop.branches).length > 0;
      expect(hasBranch || shop.online !== undefined, shop.id).toBe(true);
    }
  });

  it("ngày soát danh bạ đúng dạng YYYY-MM-DD", () => {
    expect(DIRECTORY_CHECKED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("6 shop mỗi vùng", () => {
  it("mỗi vùng đúng 6 shop, không trùng, id nào cũng có thật", () => {
    for (const region of KAITORI_REGIONS) {
      const ids = FEATURED_SHOP_IDS[region];
      expect(ids.length, region).toBe(6);
      expect(new Set(ids).size, region).toBe(6);
      // featuredShops lọc id không tồn tại → độ dài lệch là có id gõ sai.
      expect(featuredShops(region).length, region).toBe(6);
    }
  });

  it("shop được chọn cho vùng nào thì phải có mặt ở vùng đó (chi nhánh hoặc online)", () => {
    for (const region of KAITORI_REGIONS) {
      for (const shop of featuredShops(region)) {
        expect(Boolean(shop.branches[region]) || Boolean(shop.online), `${region}/${shop.id}`).toBe(true);
      }
    }
  });
});

describe("handle quét bài trên X", () => {
  it("vùng nào cũng có ít nhất một handle — không thì mục bài đăng vĩnh viễn trống", () => {
    for (const region of KAITORI_REGIONS) {
      expect(regionPostHandles(region).length, region).toBeGreaterThan(0);
    }
  });

  it("gộp hai vùng không trùng và không vượt trần 20 handle/lượt của X Search", () => {
    const all = allPostHandles();
    expect(new Set(all.map((h) => h.toLowerCase())).size).toBe(all.length);
    expect(all.length).toBeLessThanOrEqual(20);
  });

  it("tài khoản chung của chuỗi KHÔNG bị quét — chỉ hiện link (tốn tiền, không cho biết vùng)", () => {
    const scanned = new Set(allPostHandles().map((h) => h.toLowerCase()));
    for (const shop of KAITORI_SHOPS) {
      if (shop.xHandle) expect(scanned.has(shop.xHandle.toLowerCase()), shop.id).toBe(false);
    }
  });

  it("カードラボ đã loại (2026-10-27) — không quét, không hiện", () => {
    const scanned = new Set(allPostHandles().map((h) => h.toLowerCase()));
    for (const h of ["akihabara_labo", "namba_clabo", "nipponbashi_lab"]) expect(scanned.has(h), h).toBe(false);
    for (const r of KAITORI_REGIONS) expect(FEATURED_SHOP_IDS[r]).not.toContain("c-labo");
  });

  it("matchPostHandle không phân biệt hoa/thường và trả đúng chữ trong danh bạ", () => {
    expect(matchPostHandle("hbstnipponbashi")).toBe("HBSTnipponbashi");
    expect(matchPostHandle("YUYUTEINEWS")).toBe("yuyuteiNews");
    expect(matchPostHandle("someone_else")).toBeUndefined();
  });

  it("handle nào cũng tra ngược ra shop", () => {
    for (const h of allPostHandles()) expect(shopOfHandle(h), h).toBeDefined();
  });

  it("handle Osaka không lọt sang trang Tokyo và ngược lại (trừ shop online)", () => {
    const tokyo = new Set(regionPostHandles("tokyo"));
    expect(tokyo.has("hareruya2namba")).toBe(false);
    expect(tokyo.has("HBSTnipponbashi")).toBe(false);
    expect(new Set(regionPostHandles("osaka")).has("hareruya2tower")).toBe(false);
    // 遊々亭 không có cửa hàng → có ở cả hai.
    expect(tokyo.has("yuyuteiNews")).toBe(true);
    expect(new Set(regionPostHandles("osaka")).has("yuyuteiNews")).toBe(true);
  });
});

describe("tên chi nhánh cạnh bài đăng", () => {
  it("handle nào được quét cũng có mục tên chi nhánh (rỗng được, nhưng phải khai)", () => {
    const keys = new Set(Object.keys(HANDLE_BRANCH).map((h) => h.toLowerCase()));
    for (const h of allPostHandles()) expect(keys.has(h.toLowerCase()), h).toBe(true);
  });

  it("ghép tên chuỗi + chi nhánh; tài khoản online thì chỉ tên chuỗi", () => {
    expect(postSourceName("hareruya2namba")).toBe("晴れる屋2 なんば店");
    expect(postSourceName("HBSTNIPPONBASHI")).toBe("ホビーステーション 日本橋本店");
    expect(postSourceName("yuyuteiNews")).toBe("遊々亭");
    expect(postSourceName("AKIBA_YK2")).toBe("トレカショップYK 秋葉原2号店");
    expect(postSourceName("someone_else")).toBe("someone_else");
  });
});

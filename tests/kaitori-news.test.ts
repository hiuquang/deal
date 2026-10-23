/**
 * Test tin Pokémon trên trang /kaitori — dữ liệu tĩnh, nên test QUY TẮC:
 * chỉ nguồn chính thức (tin sai trên trang về giá là người ta bán hớ thật),
 * đủ dữ kiện để người đọc tự kiểm, và luôn hiện đúng NEWS_ON_PAGE tin mới nhất.
 */
import { existsSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  NEWS_CHECKED_ON,
  NEWS_ON_PAGE,
  POKEMON_NEWS,
  isOfficialNewsUrl,
  latestNews,
} from "@/lib/kaitori-news";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

describe("isOfficialNewsUrl", () => {
  it("nhận trang chính thức và subdomain của nó", () => {
    expect(isOfficialNewsUrl("https://www.pokemon-card.com/info/005705.html")).toBe(true);
    expect(isOfficialNewsUrl("https://www.30th.pokemon-card.com/product/m6a")).toBe(true);
    expect(isOfficialNewsUrl("https://www.pokemoncenter-online.com/news/?id=20260929")).toBe(true);
    expect(isOfficialNewsUrl("https://www.pokemon.co.jp/")).toBe(true);
    // Sàn bán lại: chỉ trang thông báo của chính sàn.
    expect(isOfficialNewsUrl("https://snkrdunk.com/information/331")).toBe(true);
    expect(isOfficialNewsUrl("https://about.mercari.com/press/news/articles/20260915_principles/")).toBe(true);
  });

  it("từ chối domain giả dạng, http, và link hỏng", () => {
    for (const url of [
      "https://pokemon-card.com.evil.com/info/1.html",
      "https://fakepokemon-card.com/info/1.html",
      "http://www.pokemon-card.com/info/005705.html",
      "https://x.com/pokecayoutube/status/1",
      // Trang tin đăng của Mercari KHÔNG phải nguồn tin — chỉ trang thông cáo.
      "https://jp.mercari.com/item/m123",
      "https://about.mercari.com.evil.com/press",
      "không phải link",
    ]) {
      expect(isOfficialNewsUrl(url), url).toBe(false);
    }
  });
});

describe("danh sách tin", () => {
  it("mọi tin đều trỏ về nguồn chính thức — cả nguồn chính lẫn 'xem thêm'", () => {
    for (const n of POKEMON_NEWS) {
      for (const src of [n.source, ...(n.moreSources ?? [])]) {
        expect(isOfficialNewsUrl(src.url), `${n.id}: ${src.url}`).toBe(true);
        expect(src.label.trim(), n.id).not.toBe("");
      }
    }
  });

  it("id không trùng; ngày đúng dạng; đủ tiêu đề, tóm tắt, ảnh hưởng, nhãn nguồn", () => {
    expect(new Set(POKEMON_NEWS.map((n) => n.id)).size).toBe(POKEMON_NEWS.length);
    for (const n of POKEMON_NEWS) {
      expect(n.publishedOn, n.id).toMatch(DATE);
      // Nhãn phải NGẮN — nó nằm trên thẻ tin để đọc lướt, dài là phá bố cục.
      expect(n.tag.length, n.id).toBeLessThanOrEqual(16);
      for (const field of [n.title, n.tag, n.summary, n.impact, n.source.label]) {
        expect(field.trim(), n.id).not.toBe("");
      }
    }
  });

  it("không có tin 'đăng' sau ngày soát — đó là ngày gõ nhầm", () => {
    for (const n of POKEMON_NEWS) expect(n.publishedOn <= NEWS_CHECKED_ON, n.id).toBe(true);
  });

  it("latestNews trả đúng NEWS_ON_PAGE tin, mới trước", () => {
    const top = latestNews();
    expect(top).toHaveLength(NEWS_ON_PAGE);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].publishedOn >= top[i].publishedOn).toBe(true);
    }
  });

  it("imageFile phải là webp trong /news/ và file có thật trong public/", () => {
    for (const n of POKEMON_NEWS) {
      if (!n.imageFile) continue;
      expect(n.imageFile, n.id).toMatch(/^\/news\/[a-z0-9-]+\.webp$/);
      expect(existsSync(path.join(process.cwd(), "public", n.imageFile)), n.imageFile).toBe(true);
    }
  });

  it("prompt ảnh không được nhắc tới Pokémon, nhân vật hay logo", () => {
    // IMAGE_STYLE đã cấm, nhưng prompt riêng của từng tin mà tả "Pikachu"
    // thì lệnh cấm chung vô nghĩa — chặn ngay từ chữ.
    // Nguyên từ (\b): "unbranded" là chữ ta CẦN có, không được bắt nhầm.
    const banned = /\b(pok[eé]mon|pikachu|charizard|eevee|gengar|logos?|brands?|mascot)\b/i;
    for (const n of POKEMON_NEWS) {
      if (n.imagePrompt) expect(n.imagePrompt, n.id).not.toMatch(banned);
    }
  });

  it("latestNews không làm xáo mảng gốc", () => {
    const before = POKEMON_NEWS.map((n) => n.id);
    latestNews();
    expect(POKEMON_NEWS.map((n) => n.id)).toEqual(before);
  });
});

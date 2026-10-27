/**
 * Danh bạ shop 買取 (shop THU thẻ vào) ở Tokyo và vùng Osaka/Kansai, kèm tài
 * khoản X của từng CHI NHÁNH — nguồn bài đăng hiện dưới hàng shop ở
 * /kaitori/[vùng].
 *
 * Để trong CODE chứ không phải DB: đây là tri thức về thị trường, sửa thì sửa
 * kèm review, không phải dữ liệu người dùng sinh ra.
 *
 * QUY TẮC — đừng phá:
 *  1. Chỉ thêm shop/handle khi đã **mở được trang chính thức của shop** và thấy
 *     tận mắt. Handle X phải lấy từ link trên trang cửa hàng chính thức, KHÔNG
 *     đoán theo tên: v0.32.0 từng ghi `cardlabo_`, `hareruya2_TCG`, `yuyu_tei`
 *     — cả ba đều không phải tài khoản trang chính thức trỏ tới. Shop chưa kiểm
 *     được thì ghi vào `docs/kaitori.md` mục "chờ kiểm tay".
 *  2. KHÔNG ghi địa chỉ chi tiết, giờ mở cửa, hay con số giá. Ba thứ đó đổi
 *     liên tục. Chỉ ghi KHU/GA + link chính thức.
 *  3. Mỗi lần soát lại thì cập nhật `DIRECTORY_CHECKED_ON`.
 *  4. Mỗi handle trong `xHandles` / `online.xHandles` là một nguồn bị quét 4
 *     tiếng/lần và **tốn tiền X Search** (tính theo số bài đọc) → thêm handle là
 *     thêm chi phí. Tài khoản chung của cả chuỗi (`xHandle`) chỉ để hiện link,
 *     KHÔNG quét: nó đăng khuyến mãi toàn quốc, không cho biết gì về vùng.
 */

/** Vùng — đúng hai vùng người Việt ở Nhật hay mang thẻ đi bán. */
export const KAITORI_REGIONS = ["tokyo", "osaka"] as const;
export type KaitoriRegion = (typeof KAITORI_REGIONS)[number];

export function isKaitoriRegion(value: string): value is KaitoriRegion {
  return (KAITORI_REGIONS as readonly string[]).includes(value);
}

export const REGION_LABEL: Record<KaitoriRegion, string> = {
  tokyo: "Tokyo",
  osaka: "Osaka · Kansai",
};

/**
 * Bảng xếp hạng CHỈ tính thẻ thuộc bộ này — quyết định chủ web 2026-10-27
 * ("chỉ cập nhật tiệm nào thu 30th thôi"). Gồm thẻ [M6a], Premium Deck [MF],
 * card set, và các bản in kèm nhãn "(30th)" như ミュウ(R/RGB). Giá xếp hạng là
 * giá thẻ 30th cao nhất trong bài, KHÔNG phải giá cao nhất của cả bài.
 */
export const KAITORI_FOCUS = "30th CELEBRATION";

/** Biểu tượng vùng trên thẻ chọn vùng + đầu trang vùng (emoji, không phải logo của ai). */
export const REGION_EMOJI: Record<KaitoriRegion, string> = {
  tokyo: "🗼",
  osaka: "🏯",
};

export const REGION_HINT: Record<KaitoriRegion, string> = {
  tokyo: "Akihabara · Ikebukuro",
  osaka: "Namba · Nipponbashi · Kyoto · Kobe",
};

export type KaitoriGame = "pokemon" | "onepiece" | "other";

export const GAME_LABEL: Record<KaitoriGame, string> = {
  pokemon: "Pokémon",
  onepiece: "One Piece",
  other: "TCG khác",
};

export interface KaitoriBranch {
  /** Khu/ga của các chi nhánh trong vùng. */
  places: string[];
  /**
   * Tài khoản X của chính chi nhánh trong vùng (không @), lấy từ trang cửa
   * hàng chính thức. Rỗng = chi nhánh không công bố tài khoản riêng.
   */
  xHandles: string[];
}

export interface KaitoriShop {
  id: string;
  /** Tên trên biển hiệu — giữ nguyên chữ Nhật để tra Google Maps ra đúng chỗ. */
  nameJa: string;
  /** Cách đọc, cho người chưa quen chữ Nhật gõ tìm. */
  nameLatin: string;
  /** Chi nhánh theo vùng. Vắng một vùng = shop không có chi nhánh ở đó. */
  branches: Partial<Record<KaitoriRegion, KaitoriBranch>>;
  /** Shop không có cửa hàng (thu qua bưu điện) → hiện ở MỌI vùng. */
  online?: { xHandles: string[] };
  games: KaitoriGame[];
  /** Link chính thức. Cái đầu tiên là trang 買取 — thẻ shop trỏ vào đó. */
  links: { label: string; url: string }[];
  /** Tài khoản X chung của cả chuỗi — chỉ hiện link, không quét. */
  xHandle?: string;
  mailOrder?: boolean;
}

/** Ngày soát lại toàn bộ link + handle trong danh bạ (JST). */
export const DIRECTORY_CHECKED_ON = "2026-10-21";

export const KAITORI_SHOPS: KaitoriShop[] = [
  {
    id: "hareruya2",
    nameJa: "晴れる屋2",
    nameLatin: "Hareruya 2",
    branches: {
      tokyo: {
        places: ["秋葉原", "池袋", "高田馬場", "立川"],
        xHandles: ["hareruya2tower", "hareruya2ikbkr"],
      },
      osaka: { places: ["なんば", "京都", "三宮"], xHandles: ["hareruya2namba"] },
    },
    games: ["pokemon"],
    links: [
      { label: "Trang 買取", url: "https://www.hareruya2.com/pages/buying" },
      { label: "買取 qua bưu điện", url: "https://www.hare2buy.com/" },
      { label: "Cửa hàng", url: "https://www.hareruya2.com/pages/store_menu" },
    ],
    xHandle: "hareruya2pokeca",
    mailOrder: true,
  },
  {
    id: "yuyu-tei",
    nameJa: "遊々亭",
    nameLatin: "Yuyu-tei",
    branches: {},
    online: { xHandles: ["yuyuteiNews"] },
    games: ["pokemon", "onepiece", "other"],
    links: [
      { label: "Bảng 買取 Pokémon", url: "https://yuyu-tei.jp/buy/poc/s/new" },
      { label: "Bảng 買取 One Piece", url: "https://yuyu-tei.jp/buy/opc/s/new" },
    ],
    mailOrder: true,
  },
  {
    id: "hobbystation",
    nameJa: "ホビーステーション",
    nameLatin: "Hobby Station",
    branches: {
      // Trang các chi nhánh Tokyo (shop/1, shop/19) không có tài khoản X nào.
      tokyo: { places: ["秋葉原", "池袋"], xHandles: [] },
      osaka: { places: ["日本橋"], xHandles: ["HBSTnipponbashi"] },
    },
    games: ["pokemon", "onepiece", "other"],
    links: [
      { label: "Trang 買取", url: "https://www.hbst.net/selling/" },
      { label: "Cửa hàng", url: "https://www.hbst.net/shop/" },
    ],
  },
  {
    id: "surugaya",
    nameJa: "駿河屋",
    nameLatin: "Suruga-ya",
    branches: {
      // Không quét: shop đồ cũ tổng hợp, X đăng đủ thứ ngoài thẻ — đốt tiền
      // X Search vào bài không liên quan.
      tokyo: { places: ["秋葉原"], xHandles: [] },
      osaka: { places: ["日本橋"], xHandles: [] },
    },
    games: ["pokemon", "onepiece", "other"],
    links: [
      { label: "Trang 買取", url: "https://www.suruga-ya.jp/man/kaitori/kaitoritop.html" },
      { label: "Cửa hàng", url: "https://www.suruga-ya.jp/feature/shoplist/index.html" },
    ],
    mailOrder: true,
  },
];

/**
 * Shop hiện trên hàng ngang của mỗi vùng, theo đúng thứ tự này — CHỦ WEB
 * chọn tay (quyết định 2026-10-21). Chưa có dữ liệu 買取 theo shop để xếp tự
 * động; khi nào có thì mới bàn lại, đừng tự đổi sang xếp theo số liệu.
 *
 * カードラボ đã bị LOẠI 2026-10-27 (chủ web): trang 買取 chính thức của họ
 * không công bố giá → người xem bấm sang không thấy gì. Đừng thêm lại khi
 * c-labo.jp chưa có bảng giá xem được.
 */
export const FEATURED_SHOP_IDS: Record<KaitoriRegion, string[]> = {
  tokyo: ["hareruya2", "yuyu-tei", "hobbystation", "surugaya"],
  osaka: ["hareruya2", "hobbystation", "yuyu-tei", "surugaya"],
};

export function getShop(id: string): KaitoriShop | undefined {
  return KAITORI_SHOPS.find((shop) => shop.id === id);
}

export function featuredShops(region: KaitoriRegion): KaitoriShop[] {
  return FEATURED_SHOP_IDS[region]
    .map(getShop)
    .filter((shop): shop is KaitoriShop => shop !== undefined);
}

/** Handle được quét cho một vùng: chi nhánh trong vùng + shop online, của các shop đang hiện. */
export function regionPostHandles(region: KaitoriRegion): string[] {
  const handles = featuredShops(region).flatMap((shop) => [
    ...(shop.branches[region]?.xHandles ?? []),
    ...(shop.online?.xHandles ?? []),
  ]);
  return [...new Set(handles)];
}

/** Mọi handle cần quét (gộp hai vùng) — đúng một lượt gọi Grok cho tất cả. */
export function allPostHandles(): string[] {
  return [...new Set(KAITORI_REGIONS.flatMap(regionPostHandles))];
}

/** Tìm handle trong danh bạ, không phân biệt hoa/thường (X cũng vậy). Trả đúng chữ trong danh bạ. */
export function matchPostHandle(handle: string): string | undefined {
  const lower = handle.toLowerCase();
  return allPostHandles().find((h) => h.toLowerCase() === lower);
}

/**
 * Tên chi nhánh của từng tài khoản X — cùng chuỗi có nhiều tài khoản (晴れる屋2
 * 秋葉原 vs 池袋), ghi mỗi tên chuỗi thì người xem không biết đi đâu. Lấy
 * đúng tên cửa hàng trên trang chính thức. Tài khoản chung (online) để trống.
 */
export const HANDLE_BRANCH: Record<string, string> = {
  hareruya2tower: "秋葉原タワー店",
  hareruya2ikbkr: "池袋店",
  hareruya2namba: "なんば店",
  HBSTnipponbashi: "日本橋本店",
  yuyuteiNews: "",
};

/** "晴れる屋2 なんば店" — tên hiện cạnh bài đăng. */
export function postSourceName(handle: string): string {
  const shop = shopOfHandle(handle);
  const key = Object.keys(HANDLE_BRANCH).find((h) => h.toLowerCase() === handle.toLowerCase());
  const branch = key ? HANDLE_BRANCH[key] : "";
  return shop ? `${shop.nameJa}${branch ? ` ${branch}` : ""}` : handle;
}

/** Shop nào sở hữu một handle — để ghi tên shop cạnh bài đăng. */
export function shopOfHandle(handle: string): KaitoriShop | undefined {
  const lower = handle.toLowerCase();
  return KAITORI_SHOPS.find((shop) =>
    [
      ...Object.values(shop.branches).flatMap((b) => b?.xHandles ?? []),
      ...(shop.online?.xHandles ?? []),
    ].some((h) => h.toLowerCase() === lower)
  );
}

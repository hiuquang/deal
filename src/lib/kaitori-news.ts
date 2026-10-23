/**
 * Tin Pokémon Card có thể làm giá biến động mạnh — hiện ở trang chọn vùng
 * /kaitori. Chủ web yêu cầu 2026-10-21: "3 thông tin mới nhất về pokemon có
 * thể ảnh hưởng lớn tới giá", rồi xin thêm tin SNKRDUNK → hiện 4.
 *
 * QUY TẮC — đừng phá:
 *  1. CHỈ nguồn chính thức (`OFFICIAL_NEWS_HOSTS`) = trang của CHÍNH tổ chức
 *     ra quyết định: hãng Pokémon, hoặc một sàn bán lại thông báo chính sách
 *     CỦA CHÍNH SÀN ĐÓ (thêm 2026-10-21). Không lấy tin đồn, tin leak, báo
 *     tổng hợp, bài của shop hay group. Một tin sai trên trang về GIÁ là làm
 *     người ta bán hớ/mua hớ thật — test chặn mọi link ngoài danh sách.
 *     Với SNKRDUNK: chỉ tóm tắt THÔNG BÁO công khai của họ + dẫn link; lập
 *     trường cũ không đổi — không lấy dữ liệu giá/tin đăng của sàn (điều
 *     khoản của họ cấm, xem docs/kaitori.md).
 *  2. Tự viết tóm tắt bằng tiếng Việt, KHÔNG chép nguyên văn, KHÔNG lấy ảnh.
 *     Link về bài gốc để người đọc tự kiểm.
 *  3. Chỉ chọn tin đụng tới NGUỒN CUNG hoặc CẦU thật (bán thêm, bốc thăm,
 *     in lại, promo, đổi luật thi đấu, sàn lớn cấm/ngừng bán). Tin sự kiện, livestream, phỏng vấn
 *     thì không, dù mới hơn.
 *  4. `impact` nói CƠ CHẾ ("nguồn cung tăng"), không phán giá sẽ lên/xuống
 *     bao nhiêu — DEAL không có dữ liệu để phán, và nói chắc là hứa thứ web
 *     không đưa được.
 *  5. Mỗi lần soát lại thì cập nhật `NEWS_CHECKED_ON` — ngày này hiện trên
 *     trang để người đọc biết tin cũ tới đâu.
 */

/** Chỉ nhận link từ đúng các trang chính thức này (so khớp nguyên host hoặc subdomain). */
export const OFFICIAL_NEWS_HOSTS = [
  "pokemon-card.com", // ポケモンカードゲーム公式 (+ 30th.pokemon-card.com …)
  "pokemoncenter-online.com", // ポケモンセンターオンライン
  "pokemon.co.jp", // 株式会社ポケモン
  // Sàn bán lại — CHỈ cho thông báo chính sách của chính sàn.
  "snkrdunk.com", // スニダン, mục 運営からのお知らせ
  "about.mercari.com", // メルカリ, trang thông cáo báo chí (không phải jp.mercari.com nơi có tin đăng)
];

/** Số tin hiện trên trang. Chủ web chốt 3 rồi xin thêm 1 (2026-10-21). */
export const NEWS_ON_PAGE = 4;

export function isOfficialNewsUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return OFFICIAL_NEWS_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

export interface PokemonNews {
  id: string;
  /** Ngày bài gốc đăng (JST), YYYY-MM-DD. */
  publishedOn: string;
  /** Tiêu đề do DEAL viết, tiếng Việt. */
  title: string;
  /** Nhãn 1–2 từ trên thẻ tin ("Ngừng bán", "In lại"…) — đọc lướt là biết loại tin. */
  tag: string;
  /** Màu nhãn: "down" = có thể kéo giá xuống, "up" = có thể đẩy giá lên, "watch" = cần theo dõi. */
  tone: "down" | "up" | "watch";
  /** Tin nói gì — dữ kiện, không bình luận. */
  summary: string;
  /** Vì sao có thể làm giá biến động — nói cơ chế, không phán con số. */
  impact: string;
  source: { label: string; url: string };
  /** Nguồn chính thức khác cùng chuyện (vd sàn thứ hai ra quyết định tương tự). */
  moreSources?: { label: string; url: string }[];
  /**
   * Mô tả hình minh hoạ để `npm run news:images` gửi cho Gemini/OpenAI. Chỉ tả
   * ĐỒ VẬT chung chung — xem `IMAGE_STYLE` cho phần cấm (nhân vật, logo, chữ).
   */
  imagePrompt?: string;
  /**
   * Ảnh đã tạo, đường dẫn trong `public/` (vd "/news/abc.webp"). Chỉ điền SAU
   * khi đã tạo và XEM ảnh — test chặn đường dẫn trỏ tới file không có thật.
   */
  imageFile?: string;
}

/**
 * Phong cách + điều cấm dùng chung cho mọi ảnh minh hoạ tin.
 *
 * Cấm nhân vật Pokémon, logo, bao bì "na ná hàng thật", và chữ: (1) đó là tài
 * sản trí tuệ của hãng, trên một web công khai; (2) ảnh AI giống hộp box thật
 * đặt cạnh tin về GIÁ là đánh lừa người đọc rằng đó là ảnh sản phẩm; (3) mô
 * hình ảnh viết chữ hay sai, chữ sai cạnh tin thật còn tệ hơn không có ảnh.
 */
export const IMAGE_STYLE = [
  "Flat vector illustration, minimal and friendly, navy blue (#16305c) with warm amber (#f59e0b) accents,",
  "plain white background, soft shadow, one centered subject, square composition, generous margin.",
  "Absolutely NO text, letters, numbers, logos, brand marks or watermarks.",
  "NO Pokémon, NO anime or cartoon characters, NO recognizable product packaging —",
  "only generic, unbranded everyday objects.",
].join(" ");

/** Ngày soát lại toàn bộ tin + link (JST). */
export const NEWS_CHECKED_ON = "2026-10-22";

export const POKEMON_NEWS: PokemonNews[] = [
  {
    id: "snkrdunk-30th-cardset-stop-2026-10",
    tag: "Ngừng bán",
    tone: "down",
    imageFile: "/news/snkrdunk-30th-cardset-stop-2026-10.webp",
    imagePrompt:
      "A plain unbranded gift box for collectible cards with its lid slightly lifted, a large red circular prohibition sign over it, and a small magnifying glass inspecting the opened seam.",
    publishedOn: "2026-10-19",
    title: "SNKRDUNK ngừng giao dịch 30th CELEBRATION カードセット (御三家) — cả bộ 9 loại",
    summary:
      "SNKRDUNK ngừng nhận đăng bán và giao dịch 「30th CELEBRATION カードセット(御三家)」: bộ 9 loại và cả 9 set lẻ; tin đang rao bị gỡ dần. Lý do: hộp không có màng co nên bị lợi dụng, hàng gửi tới có dấu đã mở hoặc bị tráo ruột tăng vọt. Pack mở rộng và promo pack bên trong vẫn bán riêng được. Mercari thì đã cấm đăng bán bộ set này (mở hay chưa mở) cùng pack 30th CELEBRATION chưa mở từ 16/9, chưa có ngày kết thúc.",
    impact:
      "Hai sàn bán lại lớn đều đóng với bộ set → người đang giữ mất kênh bán dễ nhất, người mua thì sợ hàng tráo ruột → giá set nguyên hộp dễ bị ép. Mua bán tay đôi thì nên mở kiểm cùng nhau ngay tại chỗ gặp.",
    source: { label: "SNKRDUNK", url: "https://snkrdunk.com/information/331" },
    moreSources: [
      { label: "Mercari", url: "https://about.mercari.com/press/news/articles/20260915_principles/" },
    ],
  },
  {
    id: "mega-special-deck-2026-11",
    tag: "In lại",
    tone: "down",
    imageFile: "/news/mega-special-deck-2026-11.webp",
    imagePrompt:
      "Three plain unbranded deck boxes standing side by side, a tear-off desk calendar page next to them, and a few small sparkles suggesting a new release day.",
    publishedOn: "2026-10-16",
    title: "Special Deck Set MEGA ra ngày 13/11 — có in lại thẻ chơi phổ biến",
    summary:
      "Bộ 3 deck メガオーダイルex · メガカイリューex · メガゲンガーex, giá ¥5,500. Hãng ghi rõ có thẻ từng phát hành được in lại; cả 3 deck đều có ハイパーボール, ボスの指令, リーリエの決心.",
    impact:
      "Thẻ in lại có thêm nguồn cung với giá gốc rẻ → giá thẻ lẻ của chúng thường chịu sức ép giảm quanh ngày phát hành.",
    source: {
      label: "pokemon-card.com",
      url: "https://www.pokemon-card.com/products/mega/mg.html",
    },
  },
  {
    id: "promo-pack-6-2026-11",
    tag: "Promo mới",
    tone: "watch",
    imageFile: "/news/promo-pack-6-2026-11.webp",
    imagePrompt:
      "A single face-down trading card with a simple geometric back pattern, tied with a ribbon like a prize, next to a small trophy cup.",
    publishedOn: "2026-10-16",
    title: "Promo Card Pack đợt 6 phát ở gym từ 1/11",
    summary:
      "Là phần thưởng khi tham gia Gym Battle / デッキそのままバトル ở các Pokémon Card Gym (không bán), 1 thẻ ngẫu nhiên trong 7 loại: メガヒードランex, ハルジオ, ゴビット và ゴース (tranh mới), ハリテヤマ, エネルギーリサイクル, ムク (in lại). Hết là ngừng.",
    impact:
      "Promo không bán, chỉ có qua sự kiện → lúc đầu ít, giá thường cao; càng nhiều người đi gym thì nguồn cung càng tăng. Ba thẻ in lại thêm nguồn cung cho bản cũ.",
    source: {
      label: "pokemon-card.com",
      url: "https://www.pokemon-card.com/info/005705.html",
    },
  },
  {
    id: "30th-extra-lottery-2026-12",
    tag: "Bốc thăm thêm",
    tone: "down",
    imageFile: "/news/30th-extra-lottery-2026-12.webp",
    imagePrompt:
      "A round raffle drum with paper tickets spilling out, beside a small stack of plain unbranded sealed boxes and a single snowflake.",
    publishedOn: "2026-09-29",
    title: "Box 30th CELEBRATION sẽ được bốc thăm bán thêm khoảng tháng 12",
    summary:
      "Pokémon Center Online thông báo dự kiến bốc thăm bán thêm vào khoảng tháng 12 cho: box 30th CELEBRATION, Premium Deck Set エーフィ・ブラッキー và 30th CELEBRATION FUTURISTIC BOX. Ngày cụ thể sẽ báo sau.",
    impact:
      "Nguồn cung chính hãng tăng thêm ở giá niêm yết → mức chênh của box đang rao cao hơn giá gốc có thể bị thu hẹp. Đang giữ box để bán thì đây là tin cần biết trước.",
    source: {
      label: "Pokémon Center Online",
      url: "https://www.pokemoncenter-online.com/news/?id=20260929",
    },
  },
];

/** N tin mới nhất, mới trước. Cùng ngày thì giữ thứ tự trong mảng. */
export function latestNews(n = NEWS_ON_PAGE): PokemonNews[] {
  return [...POKEMON_NEWS]
    .sort((a, b) => b.publishedOn.localeCompare(a.publishedOn))
    .slice(0, n);
}

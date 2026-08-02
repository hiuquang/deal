/**
 * Seed GIÁ THAM KHẢO (nguồn ngoài) — do CHỦ WEB nhập tay, KHÔNG phải giao dịch
 * trên DEAL. Idempotent (upsert theo [cardId, source, recordedAt]) → chạy lại
 * nhiều lần an toàn; thêm điểm giá mới thì bổ sung vào mảng DATA rồi chạy lại.
 *
 * Chạy: npm run db:seed-reference-prices  (DATABASE_URL trỏ DB production)
 *
 * Thời điểm ghi theo giờ Nhật (JST, +09:00).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * NGUỒN LÀ FACEBOOK — VÌ SAO PHẢI PHÂN BIỆT `kind`
 *
 * Giá quan sát trong group Facebook chủ yếu là **giá RAO**, không phải giá đã
 * chốt. Hai loại này lệch nhau đáng kể (rao cao rồi thương lượng xuống), trộn
 * chung là bóp méo mặt bằng giá. `kind` quyết định nhãn `source` hiện cho
 * người xem để họ tự biết đang nhìn loại nào:
 *
 *   kind: "rao" (mặc định) → "Facebook (giá rao)"
 *   kind: "ban"            → "Facebook (đã bán)"  ← chỉ khi bài ghi rõ đã bán
 *
 * Giá là DỮ KIỆN quan sát được — ghi lại con số thì không lấy gì của ai. Nhưng
 * KHÔNG bê ảnh hay nội dung bài của người khác sang DEAL (lý do đầy đủ ở
 * CHANGELOG v0.29.0).
 * ───────────────────────────────────────────────────────────────────────────
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Giá rao (mặc định) hay giá đã chốt xong. */
type Kind = "rao" | "ban";

type Point = {
  /** Mốc thời gian JST, vd "2026-08-02T14:30:00+09:00" */
  at: string;
  /** Số lượng (pack/bản) rao ở mức giá này — dùng làm trọng số cho TB */
  quantity: number;
  /** Đơn giá / pack (¥) */
  priceJpy: number;
  kind?: Kind;
  note?: string;
};

type Product = {
  game: "pokemon" | "onepiece" | "other";
  category: "single" | "box";
  /** Tên sản phẩm — cũng là khóa find-or-create trong catalog */
  name: string;
  /**
   * Ghi đè nhãn nguồn cho MỌI điểm giá của sản phẩm. Chỉ dùng cho dữ liệu cũ
   * đã nằm trong DB: `source` nằm trong khóa unique, đổi nhãn = sinh dòng mới
   * chứ không cập nhật dòng cũ.
   */
  source?: string;
  points: Point[];
};

function sourceLabel(kind: Kind = "rao"): string {
  return kind === "ban" ? "Facebook (đã bán)" : "Facebook (giá rao)";
}

// ─── DỮ LIỆU ───────────────────────────────────────────────────────────────
// Thêm sản phẩm mới = thêm một phần tử vào mảng này rồi chạy lại script.
const DATA: Product[] = [
  {
    game: "onepiece",
    category: "box", // pack sealed → xếp nhóm box (schema chỉ có single|box)
    name: "Round One",
    // GIỮ NGUYÊN nhãn cũ: 8 điểm giá dưới đây đã nằm trong DB production với
    // source "Round One" từ v0.21.0. Đổi nhãn là tạo 8 dòng trùng lặp.
    source: "Round One",
    points: [
      { at: "2026-07-23T12:51:00+09:00", quantity: 50, priceJpy: 15300 },
      { at: "2026-07-23T17:37:00+09:00", quantity: 10, priceJpy: 15500 },
      { at: "2026-07-23T21:16:00+09:00", quantity: 5, priceJpy: 15000 },
      { at: "2026-07-23T22:10:00+09:00", quantity: 10, priceJpy: 14000 },
      { at: "2026-07-24T06:12:00+09:00", quantity: 10, priceJpy: 14500 },
      { at: "2026-07-24T10:25:00+09:00", quantity: 10, priceJpy: 13500 },
      { at: "2026-07-24T10:47:00+09:00", quantity: 5, priceJpy: 13500 },
      { at: "2026-07-24T11:22:00+09:00", quantity: 15, priceJpy: 13000 },
    ],
  },

  // ── Box mới nổi / box sắp ra: thêm ở đây ────────────────────────────────
  // Box CHƯA có giá thì cứ để `points: []` — sản phẩm vẫn được tạo trong
  // catalog nên gõ tên ở ô tra giá là ra ngay, trang giá hiện "chưa có giao
  // dịch nào". Có tên sẵn trước ngày mở bán là lợi thế: đúng lúc cộng đồng
  // bắt đầu hỏi giá thì DEAL đã có chỗ để trả lời.
  //
  // {
  //   game: "onepiece",
  //   category: "box",
  //   name: "<tên box>",
  //   points: [
  //     { at: "2026-08-02T20:00:00+09:00", quantity: 5, priceJpy: 12000 },
  //     { at: "2026-08-02T21:30:00+09:00", quantity: 1, priceJpy: 11500, kind: "ban" },
  //   ],
  // },
];
// ───────────────────────────────────────────────────────────────────────────

// Quy ước setCode cho sản phẩm user/chủ web tự thêm (khớp repositories/cards.ts).
function userProductSetCode(game: string, category: string): string {
  const base = game === "other" ? "OTHER" : "CUSTOM";
  return category === "box" ? `${base}-BOX` : base;
}

async function seedProduct(product: Product): Promise<number> {
  const setCode = userProductSetCode(product.game, product.category);

  // Find-or-create thẻ (dedupe qua unique [game, setCode, cardNumber, language]).
  const card = await prisma.card.upsert({
    where: {
      game_setCode_cardNumber_language: {
        game: product.game,
        setCode,
        cardNumber: product.name,
        language: "JP",
      },
    },
    update: {},
    create: {
      game: product.game,
      category: product.category,
      setCode,
      cardNumber: product.name,
      language: "JP",
      nameJa: product.name,
      nameEn: product.name,
      rarity: "-",
    },
  });

  for (const p of product.points) {
    const source = product.source ?? sourceLabel(p.kind);
    await prisma.referencePrice.upsert({
      where: {
        cardId_source_recordedAt: {
          cardId: card.id,
          source,
          recordedAt: new Date(p.at),
        },
      },
      update: { quantity: p.quantity, priceJpy: p.priceJpy, note: p.note ?? null },
      create: {
        cardId: card.id,
        source,
        quantity: p.quantity,
        priceJpy: p.priceJpy,
        note: p.note ?? null,
        recordedAt: new Date(p.at),
      },
    });
  }

  console.log(`  · "${product.name}" (${card.id}) — ${product.points.length} điểm giá`);
  return product.points.length;
}

async function main() {
  let total = 0;
  for (const product of DATA) {
    total += await seedProduct(product);
  }
  console.log(`\nSeeded reference prices: ${DATA.length} sản phẩm, ${total} điểm giá.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

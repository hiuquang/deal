/**
 * Seed GIÁ THAM KHẢO (nguồn ngoài) — do CHỦ WEB nhập tay, KHÔNG phải giao dịch
 * trên DEAL. Idempotent (upsert theo [cardId, source, recordedAt]) → chạy lại
 * nhiều lần an toàn; thêm điểm giá mới thì bổ sung vào mảng DATA rồi chạy lại.
 *
 * Chạy: npm run db:seed-reference-prices  (DATABASE_URL trỏ DB production)
 *
 * Thời điểm ghi theo giờ Nhật (JST, +09:00).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// --- Sản phẩm gắn giá tham khảo ---
const PRODUCT = {
  game: "onepiece",
  category: "box", // pack sealed → xếp nhóm box (schema chỉ có single|box)
  name: "Round One",
} as const;

const SOURCE = "Round One";

// --- Dữ liệu giá tham khảo: đơn giá / pack (¥) theo thời điểm (JST) ---
const DATA: { at: string; quantity: number; priceJpy: number }[] = [
  { at: "2026-07-23T12:51:00+09:00", quantity: 50, priceJpy: 15300 },
  { at: "2026-07-23T17:37:00+09:00", quantity: 10, priceJpy: 15500 },
  { at: "2026-07-23T21:16:00+09:00", quantity: 5, priceJpy: 15000 },
  { at: "2026-07-23T22:10:00+09:00", quantity: 10, priceJpy: 14000 },
  { at: "2026-07-24T06:12:00+09:00", quantity: 10, priceJpy: 14500 },
  { at: "2026-07-24T10:25:00+09:00", quantity: 10, priceJpy: 13500 },
  { at: "2026-07-24T10:47:00+09:00", quantity: 5, priceJpy: 13500 },
  { at: "2026-07-24T11:22:00+09:00", quantity: 15, priceJpy: 13000 },
];

// Quy ước setCode cho sản phẩm user/chủ web tự thêm (khớp repositories/cards.ts).
function userProductSetCode(game: string, category: string): string {
  const base = game === "other" ? "OTHER" : "CUSTOM";
  return category === "box" ? `${base}-BOX` : base;
}

async function main() {
  const setCode = userProductSetCode(PRODUCT.game, PRODUCT.category);

  // Find-or-create thẻ (dedupe qua unique [game, setCode, cardNumber, language]).
  const card = await prisma.card.upsert({
    where: {
      game_setCode_cardNumber_language: {
        game: PRODUCT.game,
        setCode,
        cardNumber: PRODUCT.name,
        language: "JP",
      },
    },
    update: {},
    create: {
      game: PRODUCT.game,
      category: PRODUCT.category,
      setCode,
      cardNumber: PRODUCT.name,
      language: "JP",
      nameJa: PRODUCT.name,
      nameEn: PRODUCT.name,
      rarity: "-",
    },
  });

  for (const d of DATA) {
    await prisma.referencePrice.upsert({
      where: {
        cardId_source_recordedAt: {
          cardId: card.id,
          source: SOURCE,
          recordedAt: new Date(d.at),
        },
      },
      update: { quantity: d.quantity, priceJpy: d.priceJpy },
      create: {
        cardId: card.id,
        source: SOURCE,
        quantity: d.quantity,
        priceJpy: d.priceJpy,
        recordedAt: new Date(d.at),
      },
    });
  }

  console.log(
    `Seeded reference prices: card "${PRODUCT.name}" (${card.id}), ${DATA.length} điểm giá từ nguồn "${SOURCE}".`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

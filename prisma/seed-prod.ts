/**
 * Seed PRODUCTION: chỉ catalog thẻ (singles + box) — KHÔNG user demo,
 * KHÔNG listing/trade/giá mẫu. Idempotent (upsert).
 *
 * Chạy: npm run db:seed-prod (DATABASE_URL trỏ DB production)
 */
import { PrismaClient } from "@prisma/client";
import { CARDS, BOXES } from "./catalog";

const prisma = new PrismaClient();

async function main() {
  for (const c of CARDS) {
    await prisma.card.upsert({
      where: {
        game_setCode_cardNumber_language: {
          game: c.game,
          setCode: c.setCode,
          cardNumber: c.cardNumber,
          language: c.language,
        },
      },
      update: {},
      create: c,
    });
  }
  for (const b of BOXES) {
    await prisma.card.upsert({
      where: {
        game_setCode_cardNumber_language: {
          game: b.game,
          setCode: b.setCode,
          cardNumber: "BOX",
          language: "JP",
        },
      },
      update: {},
      create: {
        game: b.game,
        category: "box",
        setCode: b.setCode,
        cardNumber: "BOX",
        language: "JP",
        nameJa: b.nameJa,
        nameEn: b.nameEn,
        rarity: "BOX",
      },
    });
  }
  console.log(`Seeded catalog: ${CARDS.length} singles + ${BOXES.length} boxes.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

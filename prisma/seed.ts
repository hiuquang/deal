/**
 * Seed data cho DEAL MVP.
 * - 5 user demo (mật khẩu chung: password123)
 * - ~40 thẻ catalog (Pokémon + One Piece, JP/EN)
 * - Listings mẫu + trades đã chốt → price_records (để trang giá có dữ liệu
 *   ngay từ đầu, giải bài toán cold start / give-to-get bootstrap)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CARDS: Array<{
  game: string;
  setCode: string;
  cardNumber: string;
  language: string;
  nameJa: string;
  nameEn: string;
  rarity: string;
}> = [
  // ---- Pokémon (JP) ----
  { game: "pokemon", setCode: "sv4a", cardNumber: "205/190", language: "JP", nameJa: "リザードンex", nameEn: "Charizard ex", rarity: "SAR" },
  { game: "pokemon", setCode: "sv4a", cardNumber: "350/190", language: "JP", nameJa: "ピカチュウ", nameEn: "Pikachu", rarity: "AR" },
  { game: "pokemon", setCode: "sv2a", cardNumber: "151/165", language: "JP", nameJa: "ミュウex", nameEn: "Mew ex", rarity: "RR" },
  { game: "pokemon", setCode: "sv2a", cardNumber: "205/165", language: "JP", nameJa: "ミュウex", nameEn: "Mew ex", rarity: "SAR" },
  { game: "pokemon", setCode: "sv2a", cardNumber: "165/165", language: "JP", nameJa: "ミュウツー", nameEn: "Mewtwo", rarity: "AR" },
  { game: "pokemon", setCode: "sv1a", cardNumber: "091/073", language: "JP", nameJa: "ナンジャモ", nameEn: "Iono", rarity: "SAR" },
  { game: "pokemon", setCode: "sv1a", cardNumber: "081/073", language: "JP", nameJa: "ミモザ", nameEn: "Miriam", rarity: "SR" },
  { game: "pokemon", setCode: "s12a", cardNumber: "245/172", language: "JP", nameJa: "ギラティナVSTAR", nameEn: "Giratina VSTAR", rarity: "UR" },
  { game: "pokemon", setCode: "s12a", cardNumber: "220/172", language: "JP", nameJa: "ピカチュウ", nameEn: "Pikachu", rarity: "AR" },
  { game: "pokemon", setCode: "s8b", cardNumber: "273/184", language: "JP", nameJa: "リーリエのピッピ人形", nameEn: "Lillie's Clefairy Doll", rarity: "CHR" },
  { game: "pokemon", setCode: "s8b", cardNumber: "215/184", language: "JP", nameJa: "ゲンガーVMAX", nameEn: "Gengar VMAX", rarity: "CSR" },
  { game: "pokemon", setCode: "sv3a", cardNumber: "348/062", language: "JP", nameJa: "レックウザex", nameEn: "Rayquaza ex", rarity: "SAR" },
  { game: "pokemon", setCode: "sv5a", cardNumber: "087/066", language: "JP", nameJa: "テツノカイナex", nameEn: "Iron Hands ex", rarity: "SR" },
  { game: "pokemon", setCode: "sv4K", cardNumber: "066/066", language: "JP", nameJa: "トドロクツキex", nameEn: "Roaring Moon ex", rarity: "SAR" },
  { game: "pokemon", setCode: "sv6", cardNumber: "102/101", language: "JP", nameJa: "オーガポンex", nameEn: "Ogerpon ex", rarity: "SAR" },
  { game: "pokemon", setCode: "sv7a", cardNumber: "089/064", language: "JP", nameJa: "テラパゴスex", nameEn: "Terapagos ex", rarity: "SAR" },
  { game: "pokemon", setCode: "sv8a", cardNumber: "180/187", language: "JP", nameJa: "イーブイex", nameEn: "Eevee ex", rarity: "SAR" },
  { game: "pokemon", setCode: "promo", cardNumber: "001/SV-P", language: "JP", nameJa: "ピカチュウ (プロモ)", nameEn: "Pikachu (Promo)", rarity: "PROMO" },
  // ---- Pokémon (EN) ----
  { game: "pokemon", setCode: "OBF", cardNumber: "223/197", language: "EN", nameJa: "リザードンex (英語)", nameEn: "Charizard ex", rarity: "SIR" },
  { game: "pokemon", setCode: "151", cardNumber: "205/165", language: "EN", nameJa: "ミュウex (英語)", nameEn: "Mew ex", rarity: "SIR" },
  { game: "pokemon", setCode: "PAL", cardNumber: "269/193", language: "EN", nameJa: "ナンジャモ (英語)", nameEn: "Iono", rarity: "SIR" },
  { game: "pokemon", setCode: "SVI", cardNumber: "254/198", language: "EN", nameJa: "コライドンex (英語)", nameEn: "Koraidon ex", rarity: "SIR" },
  // ---- One Piece (JP) ----
  { game: "onepiece", setCode: "OP01", cardNumber: "OP01-120", language: "JP", nameJa: "シャンクス", nameEn: "Shanks", rarity: "SEC" },
  { game: "onepiece", setCode: "OP01", cardNumber: "OP01-001", language: "JP", nameJa: "ロロノア・ゾロ (リーダー)", nameEn: "Roronoa Zoro (Leader)", rarity: "L" },
  { game: "onepiece", setCode: "OP02", cardNumber: "OP02-120", language: "JP", nameJa: "エドワード・ニューゲート", nameEn: "Edward Newgate", rarity: "SEC" },
  { game: "onepiece", setCode: "OP03", cardNumber: "OP03-123", language: "JP", nameJa: "シャーロット・カタクリ", nameEn: "Charlotte Katakuri", rarity: "SEC" },
  { game: "onepiece", setCode: "OP04", cardNumber: "OP04-118", language: "JP", nameJa: "レベッカ (パラレル)", nameEn: "Rebecca (Parallel)", rarity: "SR" },
  { game: "onepiece", setCode: "OP05", cardNumber: "OP05-119", language: "JP", nameJa: "モンキー・D・ルフィ", nameEn: "Monkey D. Luffy", rarity: "SEC" },
  { game: "onepiece", setCode: "OP05", cardNumber: "OP05-060", language: "JP", nameJa: "サボ", nameEn: "Sabo", rarity: "SR" },
  { game: "onepiece", setCode: "OP06", cardNumber: "OP06-118", language: "JP", nameJa: "ペローナ (パラレル)", nameEn: "Perona (Parallel)", rarity: "SR" },
  { game: "onepiece", setCode: "OP07", cardNumber: "OP07-119", language: "JP", nameJa: "モンキー・D・ドラゴン", nameEn: "Monkey D. Dragon", rarity: "SEC" },
  { game: "onepiece", setCode: "OP08", cardNumber: "OP08-118", language: "JP", nameJa: "ロロノア・ゾロ (パラレル)", nameEn: "Roronoa Zoro (Parallel)", rarity: "SEC" },
  { game: "onepiece", setCode: "OP09", cardNumber: "OP09-119", language: "JP", nameJa: "シャンクス (パラレル)", nameEn: "Shanks (Parallel)", rarity: "SEC" },
  { game: "onepiece", setCode: "EB01", cardNumber: "EB01-061", language: "JP", nameJa: "ナミ (パラレル)", nameEn: "Nami (Parallel)", rarity: "SR" },
  { game: "onepiece", setCode: "ST01", cardNumber: "ST01-012", language: "JP", nameJa: "モンキー・D・ルフィ", nameEn: "Monkey D. Luffy", rarity: "SR" },
  // ---- One Piece (EN) ----
  { game: "onepiece", setCode: "OP01", cardNumber: "OP01-120", language: "EN", nameJa: "シャンクス (英語)", nameEn: "Shanks", rarity: "SEC" },
  { game: "onepiece", setCode: "OP02", cardNumber: "OP02-093", language: "EN", nameJa: "ニコ・ロビン (英語)", nameEn: "Nico Robin", rarity: "SR" },
  { game: "onepiece", setCode: "OP05", cardNumber: "OP05-119", language: "EN", nameJa: "モンキー・D・ルフィ (英語)", nameEn: "Monkey D. Luffy", rarity: "SEC" },
];

// Ảnh placeholder cho listing seed (SVG data-less file tạo sẵn trong public/uploads)
const SEED_IMAGE = "/uploads/seed-card.svg";

async function main() {
  console.log("Seeding...");

  const passwordHash = await bcrypt.hash("password123", 10);
  const userDefs = [
    { email: "taro@example.com", displayName: "カードマニアTaro" },
    { email: "hanako@example.com", displayName: "はなこレア堂" },
    { email: "kenji@example.com", displayName: "Kenji_TCG" },
    { email: "yuki@example.com", displayName: "ゆきポケ収集家" },
    { email: "demo@example.com", displayName: "デモユーザー" },
  ];
  // Giữ đồng bộ với src/lib/terms.ts
  const TERMS_VERSION = "1.0 (2026-07-14)";
  const users = [];
  for (const def of userDefs) {
    users.push(
      await prisma.user.upsert({
        where: { email: def.email },
        // Demo user luôn verified + đã đồng ý điều khoản để không bị chặn
        update: {
          emailVerifiedAt: new Date(),
          termsAcceptedVersion: TERMS_VERSION,
          termsAcceptedAt: new Date(),
        },
        create: {
          ...def,
          passwordHash,
          emailVerifiedAt: new Date(),
          termsAcceptedVersion: TERMS_VERSION,
          termsAcceptedAt: new Date(),
        },
      })
    );
  }

  const cards = [];
  for (const c of CARDS) {
    cards.push(
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
      })
    );
  }

  if ((await prisma.listing.count()) > 0) {
    console.log("Listings already seeded, skip.");
    return;
  }

  const conditions = ["PSA10", "PSA9", "RAW_NM", "RAW_LP", "RAW_MP"];
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  // Listing đang active để trang chủ có nội dung
  const activeDefs = [
    { seller: 0, card: 0, condition: "PSA10", price: 98000, note: "白かけなし、完美品です。" },
    { seller: 1, card: 3, condition: "RAW_NM", price: 14500, note: "開封後すぐスリーブ保管。" },
    { seller: 2, card: 5, condition: "PSA9", price: 52000, note: null },
    { seller: 3, card: 22, condition: "RAW_NM", price: 120000, note: "OP01シャンクス、横線なし。" },
    { seller: 0, card: 27, condition: "RAW_LP", price: 68000, note: "微細な白かけあり(写真参照)。" },
    { seller: 1, card: 11, condition: "PSA10", price: 45000, note: null },
    { seller: 4, card: 8, condition: "RAW_NM", price: 3200, note: "まとめ買い歓迎。" },
    { seller: 2, card: 31, condition: "RAW_NM", price: 88000, note: "OP09シャンクスパラレル。" },
    { seller: 3, card: 14, condition: "RAW_NM", price: 9800, note: null },
    { seller: 4, card: 18, condition: "PSA9", price: 76000, note: "英語版リザードンSIR。" },
  ];
  for (const d of activeDefs) {
    await prisma.listing.create({
      data: {
        sellerId: users[d.seller].id,
        cardId: cards[d.card].id,
        condition: d.condition,
        imageUrl: SEED_IMAGE,
        askingPriceJpy: d.price,
        tradeType: "sell",
        note: d.note,
        status: "active",
      },
    });
  }

  // Trades đã chốt → price_records (lịch sử giá cho ~10 thẻ, rải 90 ngày)
  let recordCount = 0;
  for (let cardIdx = 0; cardIdx < 12; cardIdx++) {
    const card = cards[cardIdx * 3 % cards.length];
    const base = [95000, 13000, 4800, 48000, 8500, 41000, 2900, 115000, 62000, 9200, 33000, 7400][cardIdx];
    const points = 4 + (cardIdx % 4); // 4–7 record mỗi thẻ
    for (let i = 0; i < points; i++) {
      const seller = users[(cardIdx + i) % users.length];
      const buyer = users[(cardIdx + i + 1) % users.length];
      const condition = conditions[(cardIdx + i) % conditions.length];
      // Giá dao động ±18% quanh base, có xu hướng tăng nhẹ theo thời gian
      const drift = 1 + (i / points) * 0.12;
      const noise = 1 + (((cardIdx * 7 + i * 13) % 36) - 18) / 100;
      const price = Math.round((base * drift * noise) / 100) * 100;
      const tradedAt = new Date(now - (90 - i * Math.floor(80 / points)) * DAY);
      const isConfirmed = (cardIdx + i) % 4 !== 3; // ~25% self_reported

      const listing = await prisma.listing.create({
        data: {
          sellerId: seller.id,
          cardId: card.id,
          condition,
          imageUrl: SEED_IMAGE,
          askingPriceJpy: Math.round((price * 1.08) / 100) * 100,
          tradeType: "sell",
          status: "closed",
          createdAt: new Date(tradedAt.getTime() - 5 * DAY),
        },
      });
      const conversation = await prisma.conversation.create({
        data: { listingId: listing.id, buyerId: buyer.id, sellerId: seller.id },
      });
      await prisma.message.create({
        data: { conversationId: conversation.id, senderId: buyer.id, body: "こちらの価格で取引お願いします。" },
      });
      const trade = await prisma.trade.create({
        data: {
          listingId: listing.id,
          conversationId: conversation.id,
          sellerId: seller.id,
          buyerId: buyer.id,
          initiatorId: seller.id,
          cardId: card.id,
          condition,
          finalPriceJpy: price,
          status: isConfirmed ? "confirmed" : "self_reported",
          autoCloseAt: new Date(tradedAt.getTime() + 7 * DAY),
          confirmedAt: isConfirmed ? tradedAt : null,
          createdAt: tradedAt,
        },
      });
      await prisma.priceRecord.create({
        data: {
          tradeId: trade.id,
          cardId: card.id,
          condition,
          priceJpy: price,
          reliability: isConfirmed ? "confirmed" : "self_reported",
          tradedAt,
        },
      });
      recordCount++;
    }
  }

  console.log(
    `Seeded: ${users.length} users, ${cards.length} cards, ${activeDefs.length} active listings, ${recordCount} price records.`
  );
  console.log("Demo login: demo@example.com / password123");
}

// ---- Phase 3: BOX catalog + listing/giá mẫu (idempotent, chạy được trên DB cũ) ----
const BOXES = [
  { game: "pokemon", setCode: "sv2a", nameJa: "ポケモンカード151 BOX", nameEn: "Pokemon Card 151 Box", base: 48000 },
  { game: "pokemon", setCode: "s12a", nameJa: "VSTARユニバース BOX", nameEn: "VSTAR Universe Box", base: 24000 },
  { game: "pokemon", setCode: "sv4a", nameJa: "シャイニートレジャーex BOX", nameEn: "Shiny Treasure ex Box", base: 13000 },
  { game: "pokemon", setCode: "sv8a", nameJa: "テラスタルフェスex BOX", nameEn: "Terastal Festival ex Box", base: 9800 },
  { game: "onepiece", setCode: "OP01", nameJa: "ROMANCE DAWN BOX", nameEn: "Romance Dawn Box", base: 32000 },
  { game: "onepiece", setCode: "OP05", nameJa: "新時代の主役 BOX", nameEn: "Awakening of the New Era Box", base: 21000 },
  { game: "onepiece", setCode: "OP08", nameJa: "二つの伝説 BOX", nameEn: "Two Legends Box", base: 8600 },
  { game: "onepiece", setCode: "EB01", nameJa: "メモリアルコレクション BOX", nameEn: "Memorial Collection Box", base: 12500 },
];

async function seedBoxes() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" }, take: 5 });
  if (users.length < 2) return;

  const boxCards = [];
  for (const b of BOXES) {
    boxCards.push(
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
      })
    );
  }

  const existing = await prisma.listing.count({ where: { card: { category: "box" } } });
  if (existing > 0) {
    console.log("Box listings already seeded, skip.");
    return;
  }

  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();

  // Listing box đang mở bán
  const activeBoxes = [
    { seller: 1, box: 0, condition: "BOX_SHRINK", price: 49800, note: "シュリンク付き未開封、暗所保管。" },
    { seller: 2, box: 4, condition: "BOX_SHRINK", price: 33000, note: null },
    { seller: 3, box: 2, condition: "BOX_NO_SHRINK", price: 11800, note: "シュリンクなし、ぺりぺり付き。" },
    { seller: 0, box: 6, condition: "BOX_SHRINK", price: 9200, note: null },
  ];
  for (const d of activeBoxes) {
    await prisma.listing.create({
      data: {
        sellerId: users[d.seller].id,
        cardId: boxCards[d.box].id,
        condition: d.condition,
        imageUrl: SEED_IMAGE,
        askingPriceJpy: d.price,
        tradeType: "sell",
        note: d.note,
        status: "active",
      },
    });
  }

  // Lịch sử giá cho 4 box đầu (5 record/box, rải 60 ngày)
  let records = 0;
  for (let bi = 0; bi < 4; bi++) {
    const box = boxCards[bi];
    const base = BOXES[bi].base;
    for (let i = 0; i < 5; i++) {
      const seller = users[(bi + i) % users.length];
      const buyer = users[(bi + i + 1) % users.length];
      const drift = 1 + (i / 5) * 0.15;
      const noise = 1 + (((bi * 11 + i * 17) % 24) - 12) / 100;
      const price = Math.round((base * drift * noise) / 100) * 100;
      const tradedAt = new Date(now - (60 - i * 12) * DAY);
      const isConfirmed = (bi + i) % 5 !== 4;
      const listing = await prisma.listing.create({
        data: {
          sellerId: seller.id,
          cardId: box.id,
          condition: "BOX_SHRINK",
          imageUrl: SEED_IMAGE,
          askingPriceJpy: Math.round((price * 1.06) / 100) * 100,
          tradeType: "sell",
          status: "closed",
          createdAt: new Date(tradedAt.getTime() - 4 * DAY),
        },
      });
      const conversation = await prisma.conversation.create({
        data: { listingId: listing.id, buyerId: buyer.id, sellerId: seller.id },
      });
      const trade = await prisma.trade.create({
        data: {
          listingId: listing.id,
          conversationId: conversation.id,
          sellerId: seller.id,
          buyerId: buyer.id,
          initiatorId: seller.id,
          cardId: box.id,
          condition: "BOX_SHRINK",
          finalPriceJpy: price,
          status: isConfirmed ? "confirmed" : "self_reported",
          autoCloseAt: new Date(tradedAt.getTime() + 7 * DAY),
          confirmedAt: isConfirmed ? tradedAt : null,
          createdAt: tradedAt,
        },
      });
      await prisma.priceRecord.create({
        data: {
          tradeId: trade.id,
          cardId: box.id,
          condition: "BOX_SHRINK",
          priceJpy: price,
          reliability: isConfirmed ? "confirmed" : "self_reported",
          tradedAt,
        },
      });
      records++;
    }
  }
  console.log(`Seeded boxes: ${boxCards.length} box products, ${activeBoxes.length} active listings, ${records} price records.`);
}

main()
  .then(() => seedBoxes())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

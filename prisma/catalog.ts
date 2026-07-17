/**
 * Catalog thẻ dùng chung cho seed dev (seed.ts) và seed production
 * (seed-prod.ts). Production chỉ seed catalog — KHÔNG user/listing/giá mẫu.
 */

export const CARDS: Array<{
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

// BOX (sealed) — `base` chỉ dùng cho dữ liệu giá mẫu ở seed dev.
export const BOXES = [
  { game: "pokemon", setCode: "sv2a", nameJa: "ポケモンカード151 BOX", nameEn: "Pokemon Card 151 Box", base: 48000 },
  { game: "pokemon", setCode: "s12a", nameJa: "VSTARユニバース BOX", nameEn: "VSTAR Universe Box", base: 24000 },
  { game: "pokemon", setCode: "sv4a", nameJa: "シャイニートレジャーex BOX", nameEn: "Shiny Treasure ex Box", base: 13000 },
  { game: "pokemon", setCode: "sv8a", nameJa: "テラスタルフェスex BOX", nameEn: "Terastal Festival ex Box", base: 9800 },
  { game: "onepiece", setCode: "OP01", nameJa: "ROMANCE DAWN BOX", nameEn: "Romance Dawn Box", base: 32000 },
  { game: "onepiece", setCode: "OP05", nameJa: "新時代の主役 BOX", nameEn: "Awakening of the New Era Box", base: 21000 },
  { game: "onepiece", setCode: "OP08", nameJa: "二つの伝説 BOX", nameEn: "Two Legends Box", base: 8600 },
  { game: "onepiece", setCode: "EB01", nameJa: "メモリアルコレクション BOX", nameEn: "Memorial Collection Box", base: 12500 },
];

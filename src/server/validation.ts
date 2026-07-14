import { z } from "zod";

// SQLite không có enum → đây là nguồn chân lý duy nhất cho các giá trị "enum".
export const GAMES = ["pokemon", "onepiece"] as const;
export const CATEGORIES = ["single", "box"] as const;
// Condition cho thẻ lẻ
export const SINGLE_CONDITIONS = [
  "PSA10",
  "PSA9",
  "BGS95",
  "RAW_NM",
  "RAW_LP",
  "RAW_MP",
  "RAW_HP",
  "DAMAGED",
] as const;
// Condition cho BOX chưa khui
export const BOX_CONDITIONS = ["BOX_SHRINK", "BOX_NO_SHRINK"] as const;
export const CONDITIONS = [...SINGLE_CONDITIONS, ...BOX_CONDITIONS] as const;
export const TRADE_TYPES = ["sell", "trade"] as const;

export const MAX_PRICE_JPY = 10_000_000;

const priceJpy = z
  .number()
  .int()
  .min(1, "1円以上を入力してください")
  .max(MAX_PRICE_JPY, "1,000万円以下を入力してください");

export const registerSchema = z.object({
  email: z.string().email("メールアドレスの形式が正しくありません"),
  password: z.string().min(8, "パスワードは8文字以上にしてください").max(72),
  displayName: z.string().trim().min(1, "表示名を入力してください").max(30),
  // Bắt buộc tick đồng ý 利用規約 + プライバシーポリシー khi đăng ký
  agreeTerms: z.literal(true, {
    errorMap: () => ({ message: "利用規約とプライバシーポリシーへの同意が必要です" }),
  }),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const verifyTokenSchema = z.object({
  token: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("メールアドレスの形式が正しくありません"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "パスワードは8文字以上にしてください").max(72),
});

export const cardSearchSchema = z.object({
  q: z.string().trim().max(100).optional(),
  game: z.enum(GAMES).optional(),
  category: z.enum(CATEGORIES).optional(),
});

export const createListingSchema = z.object({
  cardId: z.string().min(1),
  condition: z.enum(CONDITIONS),
  imageUrl: z
    .string()
    .regex(/^\/uploads\/[\w.-]+$/, "画像をアップロードしてください"),
  askingPriceJpy: priceJpy.optional().nullable(),
  tradeType: z.enum(TRADE_TYPES),
  station: z.string().trim().max(50).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
});

export const patchListingSchema = z.object({
  status: z.literal("cancelled"),
});

export const listListingsSchema = z.object({
  game: z.enum(GAMES).optional(),
  category: z.enum(CATEGORIES).optional(),
  cardId: z.string().optional(),
  status: z.enum(["active", "in_trade", "closed", "cancelled"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export const createMessageSchema = z.object({
  body: z.string().trim().min(1, "メッセージを入力してください").max(1000),
});

export const createTradeSchema = z.object({
  conversationId: z.string().min(1),
  finalPriceJpy: priceJpy,
});

export const confirmTradeSchema = z.object({
  finalPriceJpy: priceJpy,
});

export const pricesQuerySchema = z.object({
  condition: z.enum(CONDITIONS).optional(),
});

export const createRatingSchema = z.object({
  score: z.number().int().min(1, "1〜5で評価してください").max(5, "1〜5で評価してください"),
  comment: z.string().trim().max(300, "コメントは300文字までです").optional().nullable(),
});

export const createCommentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "コメントを入力してください")
    .max(500, "コメントは500文字までです"),
});

export const createReportSchema = z.object({
  reportedUserId: z.string().min(1),
  listingId: z.string().min(1).optional().nullable(),
  reason: z
    .string()
    .trim()
    .min(10, "通報理由は10文字以上で入力してください")
    .max(500, "通報理由は500文字までです"),
});

import { z } from "zod";
import { ApiError } from "@/server/errors";

// SQLite không có enum → đây là nguồn chân lý duy nhất cho các giá trị "enum".
export const GAMES = ["pokemon", "onepiece", "other"] as const;
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

/**
 * Condition phải khớp loại sản phẩm (single/box) — dữ liệu giá sẽ noisy nếu
 * box dùng condition thẻ lẻ và ngược lại. Dùng chung cho đăng listing và
 * khai chốt trade buy-order (nơi condition do bên khởi tạo khai).
 */
export function assertConditionMatchesCategory(category: string, condition: string): void {
  const isBoxCondition = (BOX_CONDITIONS as readonly string[]).includes(condition);
  if ((category === "box") !== isBoxCondition) {
    throw new ApiError(
      400,
      "CONDITION_MISMATCH",
      category === "box"
        ? "Với BOX, hãy chọn tình trạng còn/mất shrink."
        : "Với thẻ lẻ, hãy chọn tình trạng dành cho thẻ."
    );
  }
}
export const TRADE_TYPES = ["sell", "trade"] as const;

export const MAX_PRICE_JPY = 10_000_000;

const priceJpy = z
  .number()
  .int()
  .min(1, "Vui lòng nhập từ 1 trở lên")
  .max(MAX_PRICE_JPY, "Vui lòng nhập tối đa 10.000.000");

export const registerSchema = z.object({
  email: z.string().email("Địa chỉ email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu phải từ 8 ký tự trở lên").max(72),
  displayName: z.string().trim().min(1, "Vui lòng nhập tên hiển thị").max(30),
  // Bắt buộc tick đồng ý Điều khoản + Chính sách bảo mật khi đăng ký
  agreeTerms: z.literal(true, {
    errorMap: () => ({ message: "Bạn cần đồng ý với Điều khoản sử dụng và Chính sách bảo mật" }),
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
  email: z.string().email("Địa chỉ email không hợp lệ"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Mật khẩu phải từ 8 ký tự trở lên").max(72),
});

export const cardSearchSchema = z.object({
  q: z.string().trim().max(100).optional(),
  game: z.enum(GAMES).optional(),
  category: z.enum(CATEGORIES).optional(),
});

// User tự thêm sản phẩm/thẻ mới khi catalog thiếu (find-or-create). Mở cho MỌI
// game từ 0.12.1 (nới business-rules #13 theo quyết định chủ web); entry tự
// thêm của pokemon/onepiece mang setCode CUSTOM để tách khỏi catalog chuẩn.
// `game` optional (mặc định "other") — giữ tương thích client cũ.
export const createUserProductSchema = z.object({
  game: z.enum(GAMES).default("other"),
  name: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên sản phẩm")
    .max(100, "Tên sản phẩm tối đa 100 ký tự"),
  category: z.enum(CATEGORIES),
});

// Ảnh phải do chính /api/uploads sinh ra: đường dẫn local (dev) hoặc bucket
// public trên Supabase Storage (production). Chặn nhét URL ngoài vào listing.
const LOCAL_IMAGE = /^\/uploads\/[\w.-]+$/;
const IMAGE_FILE = /^[\w.-]+$/;

export function isOwnImageUrl(value: string): boolean {
  if (LOCAL_IMAGE.test(value)) return true;
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) return false;
  const prefix = `${supabaseUrl}/storage/v1/object/public/uploads/`;
  return value.startsWith(prefix) && IMAGE_FILE.test(value.slice(prefix.length));
}

export const createListingSchema = z.object({
  cardId: z.string().min(1),
  condition: z.enum(CONDITIONS),
  imageUrl: z.string().refine(isOwnImageUrl, "Vui lòng tải ảnh lên"),
  askingPriceJpy: priceJpy.optional().nullable(),
  quantity: z.coerce
    .number()
    .int()
    .min(1, "Số lượng phải từ 1 trở lên")
    .max(99, "Số lượng tối đa là 99")
    .default(1),
  tradeType: z.enum(TRADE_TYPES),
  station: z.string().trim().max(50).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
});

// PATCH listing: hoặc hủy tin (status), hoặc sửa giá chào (askingPriceJpy).
// askingPriceJpy có mặt (không optional) để phân biệt với nhánh status; null =
// chuyển về "thương lượng". Giá này chỉ để thương lượng, không vào dữ liệu giá thị trường.
export const patchListingSchema = z.union([
  z.object({ status: z.literal("cancelled") }),
  z.object({ askingPriceJpy: priceJpy.nullable() }),
]);

export const listListingsSchema = z.object({
  // Từ khóa tìm sản phẩm: khớp tên/set/số của thẻ trong listing.
  q: z.string().trim().max(100).optional(),
  game: z.enum(GAMES).optional(),
  category: z.enum(CATEGORIES).optional(),
  cardId: z.string().optional(),
  status: z.enum(["active", "in_trade", "closed", "cancelled"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

// --- Tin gom số lượng lớn (BuyOrder) ---
const buyQuantity = z.coerce
  .number()
  .int()
  .min(1, "Số lượng phải từ 1 trở lên")
  .max(999, "Số lượng tối đa là 999");

export const createBuyOrderSchema = z.object({
  cardId: z.string().min(1),
  quantity: buyQuantity,
  maxUnitPriceJpy: priceJpy.optional().nullable(),
});

export const listBuyOrdersSchema = z.object({
  q: z.string().trim().max(100).optional(),
  game: z.enum(GAMES).optional(),
  category: z.enum(CATEGORIES).optional(),
  cardId: z.string().optional(),
  status: z.enum(["active", "cancelled"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export const createOfferSchema = z.object({
  quantity: buyQuantity,
  message: z.string().trim().max(300, "Lời nhắn tối đa 300 ký tự").optional().nullable(),
});

// Lưu/bỏ lưu tin (❤️): kind=loại tin, id=đích, favorited=trạng thái muốn đặt.
export const toggleFavoriteSchema = z.object({
  kind: z.enum(["listing", "buy_order"]),
  id: z.string().min(1),
  favorited: z.boolean(),
});

export const createMessageSchema = z.object({
  body: z.string().trim().min(1, "Vui lòng nhập tin nhắn").max(1000),
});

export const createTradeSchema = z.object({
  conversationId: z.string().min(1),
  // Với trade từ buy-order: finalPriceJpy là ĐƠN GIÁ (giá/1 bản), kèm
  // condition + quantity do bên khởi tạo khai (service kiểm tra bắt buộc).
  finalPriceJpy: priceJpy,
  condition: z.enum(CONDITIONS).optional().nullable(),
  quantity: buyQuantity.optional().nullable(),
});

export const confirmTradeSchema = z.object({
  finalPriceJpy: priceJpy,
  // Trade buy-order: bên xác nhận phải nhập đúng số lượng (chống khai láo).
  quantity: buyQuantity.optional().nullable(),
});

export const pricesQuerySchema = z.object({
  condition: z.enum(CONDITIONS).optional(),
});

export const createRatingSchema = z.object({
  score: z.number().int().min(1, "Vui lòng đánh giá từ 1 đến 5 sao").max(5, "Vui lòng đánh giá từ 1 đến 5 sao"),
  comment: z.string().trim().max(300, "Bình luận tối đa 300 ký tự").optional().nullable(),
});

export const createCommentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập bình luận")
    .max(500, "Bình luận tối đa 500 ký tự"),
});

export const createReportSchema = z.object({
  reportedUserId: z.string().min(1),
  listingId: z.string().min(1).optional().nullable(),
  reason: z
    .string()
    .trim()
    .min(10, "Lý do báo cáo cần tối thiểu 10 ký tự")
    .max(500, "Lý do báo cáo tối đa 500 ký tự"),
});

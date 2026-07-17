// DTO dùng chung giữa backend (serialize) và frontend (type response API).
// Đây là hình dạng dữ liệu đúng theo API CONTRACT trong design.md mục 5.

export type Game = "pokemon" | "onepiece";
export type Category = "single" | "box";
export type Condition =
  | "PSA10"
  | "PSA9"
  | "BGS95"
  | "RAW_NM"
  | "RAW_LP"
  | "RAW_MP"
  | "RAW_HP"
  | "DAMAGED"
  | "BOX_SHRINK"
  | "BOX_NO_SHRINK";
export type TradeType = "sell" | "trade";
export type ListingStatus = "active" | "in_trade" | "closed" | "cancelled";
export type TradeStatus = "pending" | "confirmed" | "self_reported" | "cancelled";
export type Reliability = "confirmed" | "self_reported";

export interface UserDto {
  id: string;
  email: string;
  displayName: string;
}

export interface MeDto extends UserDto {
  contributionCount: number;
  canViewPrices: boolean;
  emailVerified: boolean;
  /** false = chưa đồng ý bản 利用規約 hiện hành → UI hiện modal yêu cầu đồng ý */
  termsAccepted: boolean;
}

export interface CardDto {
  id: string;
  game: Game;
  category: Category;
  setCode: string;
  cardNumber: string;
  language: "JP" | "EN";
  nameJa: string;
  nameEn: string;
  rarity: string;
}

export interface CommentDto {
  id: string;
  listingId: string;
  userId: string;
  userDisplayName: string;
  body: string;
  createdAt: string;
}

export type PurchaseRequestStatus = "pending" | "connected";

export interface PurchaseRequestDto {
  id: string;
  listingId: string;
  buyerId: string;
  buyerDisplayName: string;
  /** ★ trung bình của buyer (từ rating đã reveal) — giúp seller chọn đối tác */
  buyerRatingAvg: number | null;
  buyerRatingCount: number;
  buyerContributionCount: number;
  status: PurchaseRequestStatus;
  /** id conversation riêng, chỉ khác null khi đã connected */
  conversationId: string | null;
  createdAt: string;
}

export type BuyOrderStatus = "active" | "cancelled";

/** Tin "gom số lượng lớn": người mua cần N bản của 1 thẻ. */
export interface BuyOrderDto {
  id: string;
  card: CardDto;
  buyerId: string;
  buyerDisplayName: string;
  quantity: number;
  /** đơn giá tối đa mong muốn (JPY) — null nếu không khai */
  maxUnitPriceJpy: number | null;
  status: BuyOrderStatus;
  /** số chào bán hiện có (để hiện ở thẻ danh sách) */
  offerCount: number;
  createdAt: string;
}

export type BuyOrderOfferStatus = "pending" | "connected";

/** Chào bán công khai của người bán dưới 1 tin gom. */
export interface BuyOrderOfferDto {
  id: string;
  buyOrderId: string;
  sellerId: string;
  sellerDisplayName: string;
  /** ★ trung bình của người bán (rating đã reveal) — giúp người mua chọn */
  sellerRatingAvg: number | null;
  sellerRatingCount: number;
  sellerContributionCount: number;
  quantity: number;
  message: string | null;
  status: BuyOrderOfferStatus;
  /** id conversation riêng, chỉ khác null khi đã connected */
  conversationId: string | null;
  createdAt: string;
}

export interface ListingDto {
  id: string;
  card: CardDto;
  sellerId: string;
  sellerDisplayName: string;
  condition: Condition;
  imageUrl: string;
  askingPriceJpy: number | null;
  /** số lượng cùng loại người bán đang có (≥1) */
  quantity: number;
  tradeType: TradeType;
  /** ga gần nhất (最寄り駅) để hẹn giao dịch trực tiếp — null nếu không khai */
  station: string | null;
  note: string | null;
  status: ListingStatus;
  createdAt: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  senderDisplayName: string;
  body: string;
  createdAt: string;
}

export type ConversationKind = "listing" | "buy_order";

interface ConversationBase {
  id: string;
  /** thẻ liên quan — luôn có (từ listing hoặc buy-order) */
  card: CardDto;
  buyerId: string;
  /** id đối phương — link hồ sơ + tra cứu cảnh báo an toàn trước khi chốt */
  otherPartyId: string;
  otherPartyName: string;
  lastMessage: MessageDto | null;
  activeTradeId: string | null;
  updatedAt: string;
}

/**
 * Union phân biệt theo `kind`: check `kind === "listing"` là TS tự thu hẹp
 * `listing` thành non-null (và ngược lại với `buyOrder`) — không cần `!`.
 */
export type ConversationDto = ConversationBase &
  (
    | { kind: "listing"; listing: ListingDto; buyOrder: null }
    | {
        kind: "buy_order";
        listing: null;
        buyOrder: { id: string; quantity: number; maxUnitPriceJpy: number | null };
      }
  );

export interface TradeDto {
  id: string;
  /** nguồn gốc trade: từ listing hay từ tin gom */
  kind: ConversationKind;
  /** thẻ giao dịch — luôn có (denormalize trên trade, không phụ thuộc listing) */
  card: CardDto;
  condition: Condition;
  /** số bản trao đổi (listing trade luôn 1) */
  quantity: number;
  conversationId: string;
  buyerId: string;
  sellerId: string;
  initiatorId: string;
  counterpartName: string;
  /**
   * ĐƠN GIÁ (giá/1 bản) với trade buy-order; giá thẻ với trade listing.
   * null khi trade còn pending và viewer là bên chưa xác nhận (chống lộ giá trước khi tự nhập)
   */
  finalPriceJpy: number | null;
  status: TradeStatus;
  autoCloseAt: string;
  confirmedAt: string | null;
  createdAt: string;
}

export interface PriceRecordDto {
  priceJpy: number;
  condition: Condition;
  reliability: Reliability;
  /** true = lệch bất thường so với median — loại khỏi stats/chart, hiện ⚠ trong bảng */
  flagged: boolean;
  tradedAt: string;
}

export interface RatingDto {
  id: string;
  tradeId: string;
  raterId: string;
  rateeId: string;
  score: number;
  comment: string | null;
  createdAt: string;
}

/** Trạng thái rating của 1 trade dưới góc nhìn viewer (blind-mutual). */
export interface TradeRatingStateDto {
  myRating: RatingDto | null;
  /** chỉ khác null khi revealed = true */
  counterpartRating: RatingDto | null;
  revealed: boolean;
}

export interface UserSummaryDto {
  id: string;
  displayName: string;
  /** trung bình score từ các rating đã reveal; null nếu chưa có */
  ratingAvg: number | null;
  ratingCount: number;
  contributionCount: number;
  memberSince: string;
}

// ---- Hồ sơ công khai & hệ tin cậy (P10) ----

export type TrainerTier =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "master"
  | "legendary";

export type BadgeKey =
  | "trades10"
  | "trades100"
  | "trades500"
  | "topSeller"
  | "trustedTrader"
  | "perfectRating"
  | "noReport"
  | "oneYear";

/** 🟢 không có gì · 🟡 có report đang xem xét · 🔴 có vi phạm ĐÃ xác minh */
export type SafetyLevel = "green" | "yellow" | "red";

export interface ProfileSafetyDto {
  level: SafetyLevel;
  /** số report đã xác minh vi phạm */
  verifiedCount: number;
  /** số người KHÁC NHAU đang có report chờ xử lý (chống 1 người spam report) */
  pendingReporters: number;
  lastVerifiedAt: string | null;
}

export interface ProfileStatsDto {
  /** giao dịch đã chốt (confirmed + self_reported) */
  closedTrades: number;
  /** số đối tác khác nhau đã giao dịch xong */
  distinctPartners: number;
  cancelledTrades: number;
  /** closed/(closed+cancelled); null nếu chưa có giao dịch nào */
  completionRate: number | null;
}

export interface ProfileReviewDto {
  score: number;
  comment: string | null;
  raterDisplayName: string;
  createdAt: string;
}

export interface UserProfileDto {
  id: string;
  displayName: string;
  memberSince: string;
  ratingAvg: number | null;
  ratingCount: number;
  /** XP derived từ lịch sử (không lưu cột) — xem profile-service */
  xp: number;
  level: number;
  tier: TrainerTier;
  /** tiến độ trong level hiện tại (0..xpPerLevel) để vẽ thanh XP */
  xpIntoLevel: number;
  xpPerLevel: number;
  /** 0–100 — chỉ số uy tín chính; level/XP chỉ để gắn kết */
  trustScore: number;
  badges: BadgeKey[];
  stats: ProfileStatsDto;
  safety: ProfileSafetyDto;
  recentReviews: ProfileReviewDto[];
  activeListings: ListingDto[];
}

export interface PriceStatsDto {
  count: number;
  median: number | null;
  min: number | null;
  max: number | null;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

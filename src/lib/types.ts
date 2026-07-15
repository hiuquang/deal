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

export interface ConversationDto {
  id: string;
  listing: ListingDto;
  buyerId: string;
  otherPartyName: string;
  lastMessage: MessageDto | null;
  activeTradeId: string | null;
  updatedAt: string;
}

export interface TradeDto {
  id: string;
  listing: ListingDto;
  conversationId: string;
  buyerId: string;
  sellerId: string;
  initiatorId: string;
  counterpartName: string;
  /** null khi trade còn pending và viewer là bên chưa xác nhận (chống lộ giá trước khi tự nhập) */
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

export interface PriceStatsDto {
  count: number;
  median: number | null;
  min: number | null;
  max: number | null;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

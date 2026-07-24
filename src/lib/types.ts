// DTO dùng chung giữa backend (serialize) và frontend (type response API).
// Đây là hình dạng dữ liệu đúng theo API CONTRACT trong design.md mục 5.

export type Game = "pokemon" | "onepiece" | "other";
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
  /** true = VIP do chủ web chỉ định → hiện vương miện + nhãn VIP kèm tên */
  isVip: boolean;
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
  userIsVip: boolean;
  body: string;
  createdAt: string;
}

export type PurchaseRequestStatus = "pending" | "connected";

export interface PurchaseRequestDto {
  id: string;
  listingId: string;
  buyerId: string;
  buyerDisplayName: string;
  buyerIsVip: boolean;
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
  buyerIsVip: boolean;
  quantity: number;
  /** đơn giá tối đa mong muốn (JPY) — null nếu không khai */
  maxUnitPriceJpy: number | null;
  /** ảnh minh họa thẻ muốn gom — null nếu người đăng không tải lên */
  imageUrl: string | null;
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
  sellerIsVip: boolean;
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
  sellerIsVip: boolean;
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
  senderIsVip: boolean;
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
  otherPartyIsVip: boolean;
  lastMessage: MessageDto | null;
  /**
   * Số tin của đối phương gửi sau mốc "đã đọc" của viewer — huy hiệu từng dòng
   * trong danh sách chat. Chưa mở lần nào (mốc null) tính tối thiểu 1 để báo
   * "được match" (cùng quy tắc với tổng ở nav).
   */
  unreadCount: number;
  activeTradeId: string | null;
  /**
   * Nội dung tin nhắn đã bị xóa tự động (1 ngày sau khi trade chốt + cả 2 đã
   * đánh giá). Conversation vẫn còn (link lịch sử giao dịch không gãy) — UI
   * hiện thông báo "chat đã xóa" thay danh sách tin, khóa ô nhập.
   */
  messagesPurged: boolean;
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
  counterpartIsVip: boolean;
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
  isVip: boolean;
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
  raterIsVip: boolean;
  createdAt: string;
}

export interface UserProfileDto {
  id: string;
  displayName: string;
  isVip: boolean;
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

// ---- Hoạt động trên tin của tôi (thông báo ở trang cá nhân) ----

export type ActivityKind = "comment" | "request" | "offer";

/**
 * 1 dòng hoạt động: người khác bình luận vào tin mình / gửi 購入希望 (pending)
 * / chào bán vào tin gom của mình (pending). Derived — không có bảng riêng.
 */
export interface ActivityItemDto {
  kind: ActivityKind;
  /** id để dựng link đích: listingId (comment/request) hoặc buyOrderId (offer) */
  targetId: string;
  cardNameJa: string;
  actorName: string;
  actorIsVip: boolean;
  /** nội dung bình luận (kind=comment) */
  body: string | null;
  /** số lượng chào bán (kind=offer) */
  quantity: number | null;
  /** mới hơn mốc activitySeenAt của viewer → highlight + tính vào badge */
  isNew: boolean;
  createdAt: string;
}

export interface ActivityDto {
  items: ActivityItemDto[];
  /** số item isNew — khớp con số badge ở nav */
  newCount: number;
}

// ---- Tin đã lưu (❤️ favorites) ----

export type FavoriteKind = "listing" | "buy_order";

/**
 * 1 mục đã lưu ở trang cá nhân. `available=false` = tin đã gỡ/bán/hủy (hoặc
 * bị xóa) → UI hiện "sản phẩm này không còn", vẫn cho bấm bỏ lưu.
 */
export interface SavedItemDto {
  kind: FavoriteKind;
  /** id đích để dựng link (listingId hoặc buyOrderId) — null nếu tin đã bị xóa cứng */
  targetId: string | null;
  cardNameJa: string | null;
  /** ảnh (chỉ listing) để hiện thumbnail */
  imageUrl: string | null;
  /** giá chào (listing) hoặc đơn giá tối đa (buy_order); null = 要相談/không khai */
  priceJpy: number | null;
  /** còn nhận giao dịch không — false thì hiện "không còn" */
  available: boolean;
  savedAt: string;
}

/** Tập id đã lưu của viewer — để tô tim đầy/rỗng trên thẻ (1 request/toàn trang). */
export interface FavoriteIdsDto {
  listingIds: string[];
  buyOrderIds: string[];
}

export interface PriceStatsDto {
  count: number;
  median: number | null;
  min: number | null;
  max: number | null;
}

/**
 * Giá tham khảo từ nguồn ngoài (vd Round One) — KHÔNG phải giao dịch trên DEAL.
 * quantity = số lượng (pack) quan sát; priceJpy = đơn giá/pack.
 */
export interface ReferencePriceDto {
  source: string;
  quantity: number;
  priceJpy: number;
  note: string | null;
  recordedAt: string;
}

export interface ReferencePriceStatsDto extends PriceStatsDto {
  /** Trung bình có trọng số theo quantity (¥/pack) */
  weightedAvg: number | null;
  /** Tổng số lượng (pack) trên tất cả điểm giá */
  totalQuantity: number;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

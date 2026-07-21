// Tầng gọi API duy nhất của frontend — component KHÔNG fetch trực tiếp.
// Mọi hàm map 1-1 với API CONTRACT trong design.md mục 5.
import type {
  ActivityDto,
  ApiErrorBody,
  BuyOrderDto,
  BuyOrderOfferDto,
  CardDto,
  Category,
  CommentDto,
  Condition,
  ConversationDto,
  Game,
  ListingDto,
  MeDto,
  MessageDto,
  PriceRecordDto,
  PriceStatsDto,
  PurchaseRequestDto,
  RatingDto,
  TradeDto,
  TradeRatingStateDto,
  UserDto,
  UserProfileDto,
  UserSummaryDto,
} from "@/lib/types";

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers:
      init?.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json", ...init?.headers }
        : init?.headers,
  });
  if (!res.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      // body không phải JSON → dùng thông báo mặc định
    }
    throw new ApiClientError(
      res.status,
      body?.error.code ?? "UNKNOWN",
      body?.error.message ?? "通信エラーが発生しました。",
      body?.error.details
    );
  }
  return (await res.json()) as T;
}

const json = (data: unknown): RequestInit => ({
  method: "POST",
  body: JSON.stringify(data),
});

export const api = {
  // ---- auth ----
  register: (data: {
    email: string;
    password: string;
    displayName: string;
    agreeTerms: boolean;
  }) => request<{ user: UserDto }>("/api/auth/register", json(data)),
  acceptTerms: () =>
    request<{ ok: boolean }>("/api/auth/accept-terms", { method: "POST" }),
  login: (data: { email: string; password: string }) =>
    request<{ user: UserDto }>("/api/auth/login", json(data)),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  me: () => request<{ user: MeDto }>("/api/auth/me"),
  verifyEmail: (token: string) =>
    request<{ ok: boolean }>("/api/auth/verify", json({ token })),
  resendVerification: () =>
    request<{ ok: boolean }>("/api/auth/resend-verification", { method: "POST" }),
  forgotPassword: (email: string) =>
    request<{ ok: boolean }>("/api/auth/forgot", json({ email })),
  resetPassword: (token: string, password: string) =>
    request<{ ok: boolean }>("/api/auth/reset", json({ token, password })),
  devMailbox: () =>
    request<{
      emails: { id: string; to: string; subject: string; body: string; createdAt: string }[];
    }>("/api/dev/mailbox"),

  // ---- cards ----
  searchCards: (q: string, game?: Game, category?: Category) =>
    request<{ cards: CardDto[] }>(
      `/api/cards?q=${encodeURIComponent(q)}${game ? `&game=${game}` : ""}${
        category ? `&category=${category}` : ""
      }`
    ),
  getCard: (id: string) => request<{ card: CardDto }>(`/api/cards/${id}`),
  /** Tự thêm sản phẩm/thẻ khi catalog thiếu (find-or-create phía server, mọi game). */
  createUserProduct: (data: { game: Game; name: string; category: Category }) =>
    request<{ card: CardDto }>("/api/cards", json(data)),

  // ---- uploads ----
  uploadImage: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ url: string }>("/api/uploads", { method: "POST", body: form });
  },

  // ---- listings ----
  listListings: (
    params: {
      q?: string;
      game?: Game;
      category?: Category;
      cardId?: string;
      page?: number;
      mine?: boolean;
    } = {}
  ) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.game) qs.set("game", params.game);
    if (params.category) qs.set("category", params.category);
    if (params.cardId) qs.set("cardId", params.cardId);
    if (params.page) qs.set("page", String(params.page));
    if (params.mine) qs.set("mine", "1");
    return request<{ listings: ListingDto[]; total: number }>(
      `/api/listings?${qs.toString()}`
    );
  },
  createListing: (data: {
    cardId: string;
    condition: Condition;
    imageUrl: string;
    askingPriceJpy?: number | null;
    quantity: number;
    tradeType: "sell" | "trade";
    station?: string | null;
    note?: string | null;
  }) => request<{ listing: ListingDto }>("/api/listings", json(data)),
  getListing: (id: string) => request<{ listing: ListingDto }>(`/api/listings/${id}`),
  cancelListing: (id: string) =>
    request<{ listing: ListingDto }>(`/api/listings/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "cancelled" }),
    }),
  updateListingPrice: (id: string, askingPriceJpy: number | null) =>
    request<{ listing: ListingDto }>(`/api/listings/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ askingPriceJpy }),
    }),

  // ---- buy orders (tin gom số lượng lớn: người mua đăng → người bán chào bán) ----
  listBuyOrders: (
    params: {
      q?: string;
      game?: Game;
      category?: Category;
      cardId?: string;
      page?: number;
      mine?: boolean;
    } = {}
  ) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.game) qs.set("game", params.game);
    if (params.category) qs.set("category", params.category);
    if (params.cardId) qs.set("cardId", params.cardId);
    if (params.page) qs.set("page", String(params.page));
    if (params.mine) qs.set("mine", "1");
    return request<{ buyOrders: BuyOrderDto[]; total: number }>(
      `/api/buy-orders?${qs.toString()}`
    );
  },
  createBuyOrder: (data: {
    cardId: string;
    quantity: number;
    maxUnitPriceJpy?: number | null;
  }) => request<{ buyOrder: BuyOrderDto }>("/api/buy-orders", json(data)),
  getBuyOrder: (id: string) =>
    request<{ buyOrder: BuyOrderDto }>(`/api/buy-orders/${id}`),
  cancelBuyOrder: (id: string) =>
    request<{ buyOrder: BuyOrderDto }>(`/api/buy-orders/${id}/cancel`, { method: "POST" }),
  listOffers: (buyOrderId: string) =>
    request<{ offers: BuyOrderOfferDto[] }>(`/api/buy-orders/${buyOrderId}/offers`),
  createOffer: (buyOrderId: string, data: { quantity: number; message?: string | null }) =>
    request<{ offer: BuyOrderOfferDto }>(`/api/buy-orders/${buyOrderId}/offers`, json(data)),
  connectOffer: (offerId: string) =>
    request<{ offer: BuyOrderOfferDto; conversationId: string }>(
      `/api/buy-orders/offers/${offerId}/connect`,
      { method: "POST" }
    ),

  // ---- comments (bình luận công khai dưới listing) ----
  listComments: (listingId: string) =>
    request<{ comments: CommentDto[] }>(`/api/listings/${listingId}/comments`),
  postComment: (listingId: string, body: string) =>
    request<{ comment: CommentDto }>(`/api/listings/${listingId}/comments`, json({ body })),

  // ---- purchase requests (luồng mua: 購入希望 → seller 連携) ----
  sendPurchaseRequest: (listingId: string) =>
    request<{ request: PurchaseRequestDto }>(`/api/listings/${listingId}/requests`, {
      method: "POST",
    }),
  listPurchaseRequests: (listingId: string) =>
    request<{ requests: PurchaseRequestDto[] }>(`/api/listings/${listingId}/requests`),
  getMyPurchaseRequest: (listingId: string) =>
    request<{ request: PurchaseRequestDto | null }>(
      `/api/listings/${listingId}/requests/me`
    ),
  connectPurchaseRequest: (requestId: string) =>
    request<{ request: PurchaseRequestDto; conversationId: string }>(
      `/api/requests/${requestId}/connect`,
      { method: "POST" }
    ),

  // ---- chat ----
  listConversations: () =>
    request<{ conversations: ConversationDto[] }>("/api/conversations"),
  unreadCount: () =>
    request<{ count: number; activityCount: number }>("/api/conversations/unread-count"),

  // ---- hoạt động trên tin của tôi (thông báo trang cá nhân) ----
  getActivity: () => request<ActivityDto>("/api/activity"),
  markActivityRead: () => request<{ ok: boolean }>("/api/activity/read", { method: "POST" }),
  markConversationRead: (conversationId: string) =>
    request<{ ok: boolean }>(`/api/conversations/${conversationId}/read`, {
      method: "POST",
    }),
  getMessages: (conversationId: string, after?: string) =>
    request<{ messages: MessageDto[] }>(
      `/api/conversations/${conversationId}/messages${after ? `?after=${after}` : ""}`
    ),
  sendMessage: (conversationId: string, body: string) =>
    request<{ message: MessageDto }>(
      `/api/conversations/${conversationId}/messages`,
      json({ body })
    ),

  // ---- trades ----
  createTrade: (data: {
    conversationId: string;
    /** trade buy-order: ĐƠN GIÁ (giá/1 bản); trade listing: giá thẻ */
    finalPriceJpy: number;
    /** bắt buộc với trade buy-order (tin gom không khai condition) */
    condition?: Condition | null;
    quantity?: number | null;
  }) => request<{ trade: TradeDto }>("/api/trades", json(data)),
  listTrades: () => request<{ trades: TradeDto[] }>("/api/trades"),
  getTrade: (id: string) => request<{ trade: TradeDto }>(`/api/trades/${id}`),
  confirmTrade: (id: string, finalPriceJpy: number, quantity?: number | null) =>
    request<{ trade: TradeDto }>(`/api/trades/${id}/confirm`, json({ finalPriceJpy, quantity })),
  cancelTrade: (id: string) =>
    request<{ trade: TradeDto }>(`/api/trades/${id}/cancel`, { method: "POST" }),

  // ---- ratings (blind-mutual) ----
  getTradeRating: (tradeId: string) =>
    request<TradeRatingStateDto>(`/api/trades/${tradeId}/rating`),
  rateTrade: (tradeId: string, data: { score: number; comment?: string | null }) =>
    request<{ rating: RatingDto }>(`/api/trades/${tradeId}/rating`, json(data)),

  // ---- users ----
  getUserSummary: (userId: string) =>
    request<{ user: UserSummaryDto }>(`/api/users/${userId}/summary`),
  getUserProfile: (userId: string) =>
    request<{ profile: UserProfileDto }>(`/api/users/${userId}/profile`),

  // ---- reports ----
  reportUser: (data: { reportedUserId: string; listingId?: string | null; reason: string }) =>
    request<{ ok: boolean }>("/api/reports", json(data)),

  // ---- prices ----
  getPrices: (cardId: string, condition?: Condition) =>
    request<{ card: CardDto; records: PriceRecordDto[]; stats: PriceStatsDto }>(
      `/api/prices/${cardId}${condition ? `?condition=${condition}` : ""}`
    ),
};

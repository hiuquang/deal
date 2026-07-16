import type { Card, User } from "@prisma/client";
import type { ListingWithRelations } from "@/server/repositories/listings";
import type { TradeWithRelations } from "@/server/repositories/trades";
import type { BuyOrderWithRelations } from "@/server/repositories/buy-orders";
import type {
  BuyOrderDto,
  BuyOrderStatus,
  CardDto,
  Condition,
  Game,
  ListingDto,
  ListingStatus,
  MessageDto,
  TradeDto,
  TradeStatus,
  TradeType,
  UserDto,
} from "@/lib/types";

export function toUserDto(user: User): UserDto {
  return { id: user.id, email: user.email, displayName: user.displayName };
}

export function toCardDto(card: Card): CardDto {
  return {
    id: card.id,
    game: card.game as Game,
    category: card.category as CardDto["category"],
    setCode: card.setCode,
    cardNumber: card.cardNumber,
    language: card.language as "JP" | "EN",
    nameJa: card.nameJa,
    nameEn: card.nameEn,
    rarity: card.rarity,
  };
}

export function toListingDto(listing: ListingWithRelations): ListingDto {
  return {
    id: listing.id,
    card: toCardDto(listing.card),
    sellerId: listing.seller.id,
    sellerDisplayName: listing.seller.displayName,
    condition: listing.condition as Condition,
    imageUrl: listing.imageUrl,
    askingPriceJpy: listing.askingPriceJpy,
    quantity: listing.quantity,
    tradeType: listing.tradeType as TradeType,
    station: listing.station,
    note: listing.note,
    status: listing.status as ListingStatus,
    createdAt: listing.createdAt.toISOString(),
  };
}

export function toBuyOrderDto(order: BuyOrderWithRelations): BuyOrderDto {
  return {
    id: order.id,
    card: toCardDto(order.card),
    buyerId: order.buyer.id,
    buyerDisplayName: order.buyer.displayName,
    quantity: order.quantity,
    maxUnitPriceJpy: order.maxUnitPriceJpy,
    status: order.status as BuyOrderStatus,
    offerCount: order._count.offers,
    createdAt: order.createdAt.toISOString(),
  };
}

type MessageWithSender = {
  id: string;
  conversationId: string;
  body: string;
  createdAt: Date;
  sender: { id: string; displayName: string };
};

export function toMessageDto(message: MessageWithSender): MessageDto {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.sender.id,
    senderDisplayName: message.sender.displayName,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  };
}

export function toTradeDto(trade: TradeWithRelations, viewerId: string): TradeDto {
  const counterpart = trade.buyer.id === viewerId ? trade.seller : trade.buyer;
  // Khi pending, bên xác nhận phải tự nhập giá độc lập → không trả giá đã khai
  // cho họ (nếu không, check PRICE_MISMATCH chống khai láo mất tác dụng).
  const priceVisible =
    trade.status !== "pending" || trade.initiatorId === viewerId;
  return {
    id: trade.id,
    kind: trade.buyOrderId ? "buy_order" : "listing",
    card: toCardDto(trade.card),
    condition: trade.condition as Condition,
    quantity: trade.quantity,
    conversationId: trade.conversationId,
    buyerId: trade.buyerId,
    sellerId: trade.sellerId,
    initiatorId: trade.initiatorId,
    counterpartName: counterpart.displayName,
    finalPriceJpy: priceVisible ? trade.finalPriceJpy : null,
    status: trade.status as TradeStatus,
    autoCloseAt: trade.autoCloseAt.toISOString(),
    confirmedAt: trade.confirmedAt?.toISOString() ?? null,
    createdAt: trade.createdAt.toISOString(),
  };
}

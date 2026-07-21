import { ApiError } from "@/server/errors";
import * as cards from "@/server/repositories/cards";
import * as buyOrders from "@/server/repositories/buy-orders";
import { toBuyOrderDto } from "@/server/serializers";
import type { BuyOrderDto } from "@/lib/types";

export async function list(filter: {
  q?: string;
  game?: string;
  category?: string;
  cardId?: string;
  status?: string;
  buyerId?: string;
  page: number;
}): Promise<{ buyOrders: BuyOrderDto[]; total: number }> {
  const { buyOrders: rows, total } = await buyOrders.listBuyOrders(filter);
  return { buyOrders: rows.map(toBuyOrderDto), total };
}

export async function create(
  buyerId: string,
  input: { cardId: string; quantity: number; maxUnitPriceJpy?: number | null }
): Promise<BuyOrderDto> {
  const card = await cards.findCardById(input.cardId);
  if (!card) {
    throw new ApiError(404, "CARD_NOT_FOUND", "Không tìm thấy thẻ đã chọn.");
  }
  const order = await buyOrders.createBuyOrder({
    buyerId,
    cardId: input.cardId,
    quantity: input.quantity,
    maxUnitPriceJpy: input.maxUnitPriceJpy ?? null,
  });
  console.log(`[buy-order] created ${order.id} by ${buyerId} (card ${card.id} x${input.quantity})`);
  return toBuyOrderDto(order);
}

export async function getById(id: string): Promise<BuyOrderDto> {
  const order = await buyOrders.findBuyOrderById(id);
  if (!order) {
    throw new ApiError(404, "NOT_FOUND", "Không tìm thấy tin gom.");
  }
  return toBuyOrderDto(order);
}

export async function cancel(userId: string, id: string): Promise<BuyOrderDto> {
  const order = await buyOrders.findBuyOrderById(id);
  if (!order) {
    throw new ApiError(404, "NOT_FOUND", "Không tìm thấy tin gom.");
  }
  if (order.buyerId !== userId) {
    throw new ApiError(403, "FORBIDDEN", "Bạn chỉ thao tác được trên tin gom của mình.");
  }
  if (order.status !== "active") {
    throw new ApiError(409, "INVALID_STATUS", "Tin gom này đã kết thúc.");
  }
  const updated = await buyOrders.updateBuyOrderStatus(id, "cancelled");
  console.log(`[buy-order] cancelled ${id} by ${userId}`);
  return toBuyOrderDto(updated);
}

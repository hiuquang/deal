import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";

export const offerInclude = {
  seller: { select: { id: true, displayName: true } },
  buyOrder: { select: { id: true, buyerId: true, status: true } },
} satisfies Prisma.BuyOrderOfferInclude;

export type OfferWithRelations = Prisma.BuyOrderOfferGetPayload<{
  include: typeof offerInclude;
}>;

export function findOfferById(id: string) {
  return prisma.buyOrderOffer.findUnique({ where: { id }, include: offerInclude });
}

export function findOffer(buyOrderId: string, sellerId: string) {
  return prisma.buyOrderOffer.findUnique({
    where: { buyOrderId_sellerId: { buyOrderId, sellerId } },
    include: offerInclude,
  });
}

export function listOffersForOrder(buyOrderId: string) {
  return prisma.buyOrderOffer.findMany({
    where: { buyOrderId },
    include: offerInclude,
    orderBy: { createdAt: "desc" },
  });
}

export function createOffer(data: {
  buyOrderId: string;
  sellerId: string;
  quantity: number;
  message: string | null;
}) {
  return prisma.buyOrderOffer.create({ data, include: offerInclude });
}

export function markConnected(id: string) {
  return prisma.buyOrderOffer.update({
    where: { id },
    data: { status: "connected" },
    include: offerInclude,
  });
}

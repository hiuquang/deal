import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";

export const requestInclude = {
  buyer: { select: { id: true, displayName: true } },
  listing: { select: { id: true, sellerId: true, status: true } },
} satisfies Prisma.PurchaseRequestInclude;

export type RequestWithRelations = Prisma.PurchaseRequestGetPayload<{
  include: typeof requestInclude;
}>;

export function findRequestById(id: string) {
  return prisma.purchaseRequest.findUnique({ where: { id }, include: requestInclude });
}

export function findRequest(listingId: string, buyerId: string) {
  return prisma.purchaseRequest.findUnique({
    where: { listingId_buyerId: { listingId, buyerId } },
    include: requestInclude,
  });
}

export function listRequestsForListing(listingId: string) {
  return prisma.purchaseRequest.findMany({
    where: { listingId },
    include: requestInclude,
    orderBy: { createdAt: "asc" },
  });
}

export function createRequest(listingId: string, buyerId: string) {
  return prisma.purchaseRequest.create({
    data: { listingId, buyerId },
    include: requestInclude,
  });
}

export function markConnected(id: string) {
  return prisma.purchaseRequest.update({
    where: { id },
    data: { status: "connected" },
    include: requestInclude,
  });
}

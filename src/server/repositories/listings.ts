import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";

export const listingInclude = {
  card: true,
  seller: { select: { id: true, displayName: true } },
} satisfies Prisma.ListingInclude;

export type ListingWithRelations = Prisma.ListingGetPayload<{
  include: typeof listingInclude;
}>;

const PAGE_SIZE = 20;

export async function listListings(filter: {
  q?: string;
  game?: string;
  category?: string;
  cardId?: string;
  status?: string;
  sellerId?: string;
  page: number;
}) {
  const cardFilter: Prisma.CardWhereInput = {
    ...(filter.game ? { game: filter.game } : {}),
    ...(filter.category ? { category: filter.category } : {}),
    // Tìm sản phẩm = tìm theo thẻ liên kết (tên JP/EN, set, số thẻ) —
    // cùng cách khớp với autocomplete thẻ ở searchCards.
    ...(filter.q
      ? {
          OR: [
            { nameJa: { contains: filter.q } },
            { nameEn: { contains: filter.q } },
            { setCode: { contains: filter.q } },
            { cardNumber: { contains: filter.q } },
          ],
        }
      : {}),
  };
  const where: Prisma.ListingWhereInput = {
    ...(filter.cardId ? { cardId: filter.cardId } : {}),
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.sellerId ? { sellerId: filter.sellerId } : {}),
    ...(Object.keys(cardFilter).length ? { card: cardFilter } : {}),
  };
  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: listingInclude,
      orderBy: { createdAt: "desc" },
      skip: (filter.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.listing.count({ where }),
  ]);
  return { listings, total };
}

export function findListingById(id: string) {
  return prisma.listing.findUnique({ where: { id }, include: listingInclude });
}

export function createListing(data: {
  sellerId: string;
  cardId: string;
  condition: string;
  imageUrl: string;
  askingPriceJpy: number | null;
  tradeType: string;
  station: string | null;
  note: string | null;
}) {
  return prisma.listing.create({ data, include: listingInclude });
}

export function updateListingStatus(id: string, status: string) {
  return prisma.listing.update({
    where: { id },
    data: { status },
    include: listingInclude,
  });
}

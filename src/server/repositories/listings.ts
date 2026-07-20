import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";

export const listingInclude = {
  card: true,
  seller: { select: { id: true, displayName: true, isVip: true } },
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
  // Lọc cấu trúc (game/category) luôn áp lên thẻ liên kết.
  const cardFilter: Prisma.CardWhereInput = {
    ...(filter.game ? { game: filter.game } : {}),
    ...(filter.category ? { category: filter.category } : {}),
  };
  // Tìm kiếm tự do: khớp thẻ liên kết (tên JP/EN, set, số thẻ — cùng cách với
  // autocomplete searchCards) HOẶC tên ga gần nhất của tin (station nằm trực
  // tiếp trên listing, không thuộc card). Đặt OR ở tầng listing để gộp cả hai.
  const searchFilter: Prisma.ListingWhereInput = filter.q
    ? {
        OR: [
          { card: { nameJa: { contains: filter.q } } },
          { card: { nameEn: { contains: filter.q } } },
          { card: { setCode: { contains: filter.q } } },
          { card: { cardNumber: { contains: filter.q } } },
          { station: { contains: filter.q } },
        ],
      }
    : {};
  const where: Prisma.ListingWhereInput = {
    ...(filter.cardId ? { cardId: filter.cardId } : {}),
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.sellerId ? { sellerId: filter.sellerId } : {}),
    ...(Object.keys(cardFilter).length ? { card: cardFilter } : {}),
    ...searchFilter,
  };
  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: listingInclude,
      // Tin của người bán VIP nổi lên đầu bảng (đặc quyền VIP 0.12.1),
      // trong mỗi nhóm vẫn mới nhất trước.
      orderBy: [{ seller: { isVip: "desc" } }, { createdAt: "desc" }],
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
  quantity: number;
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

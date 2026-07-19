import { prisma } from "@/server/db";

export function listComments(listingId: string) {
  return prisma.comment.findMany({
    where: { listingId },
    include: { user: { select: { id: true, displayName: true, isVip: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
}

export function createComment(listingId: string, userId: string, body: string) {
  return prisma.comment.create({
    data: { listingId, userId, body },
    include: { user: { select: { id: true, displayName: true, isVip: true } } },
  });
}

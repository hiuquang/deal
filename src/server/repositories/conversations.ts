import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";
import { listingInclude } from "@/server/repositories/listings";

export const conversationInclude = {
  listing: { include: listingInclude },
  buyer: { select: { id: true, displayName: true } },
} satisfies Prisma.ConversationInclude;

export type ConversationWithRelations = Prisma.ConversationGetPayload<{
  include: typeof conversationInclude;
}>;

export function findConversationById(id: string) {
  return prisma.conversation.findUnique({
    where: { id },
    include: conversationInclude,
  });
}

export function findConversationByPair(listingId: string, buyerId: string) {
  return prisma.conversation.findUnique({
    where: { listingId_buyerId: { listingId, buyerId } },
  });
}

export function findOrCreateConversation(listingId: string, buyerId: string) {
  return prisma.conversation.upsert({
    where: { listingId_buyerId: { listingId, buyerId } },
    update: {},
    // Hội thoại chỉ sinh ra khi seller connect → seller vừa "thấy" nó (mốc =
    // now); buyer chưa đọc (null) để hiện thông báo được match.
    create: { listingId, buyerId, sellerLastReadAt: new Date() },
    include: conversationInclude,
  });
}

/** Cập nhật mốc đã đọc của 1 bên về thời điểm hiện tại. */
export function markConversationRead(conversationId: string, role: "buyer" | "seller") {
  return prisma.conversation.update({
    where: { id: conversationId },
    data:
      role === "buyer"
        ? { buyerLastReadAt: new Date() }
        : { sellerLastReadAt: new Date() },
  });
}

/** Số tin của bên kia (senderId != me) gửi sau mốc `after` (null = đếm tất cả). */
export function countUnreadMessages(
  conversationId: string,
  excludeSenderId: string,
  after: Date | null
) {
  return prisma.message.count({
    where: {
      conversationId,
      senderId: { not: excludeSenderId },
      ...(after ? { createdAt: { gt: after } } : {}),
    },
  });
}

/** Hội thoại của user kèm mốc đã đọc — phục vụ đếm tổng tin chưa đọc. */
export function listConversationsWithReadState(userId: string) {
  return prisma.conversation.findMany({
    where: { OR: [{ buyerId: userId }, { listing: { sellerId: userId } }] },
    select: {
      id: true,
      buyerId: true,
      buyerLastReadAt: true,
      sellerLastReadAt: true,
      listing: { select: { sellerId: true } },
    },
  });
}

/** Mọi conversation user tham gia (là buyer, hoặc là seller của listing). */
export function listConversationsForUser(userId: string) {
  return prisma.conversation.findMany({
    where: {
      OR: [{ buyerId: userId }, { listing: { sellerId: userId } }],
    },
    include: {
      ...conversationInclude,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { sender: { select: { id: true, displayName: true } } },
      },
      trades: {
        where: { status: { not: "cancelled" } },
        select: { id: true },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export function listMessages(conversationId: string, afterCreatedAt?: Date) {
  return prisma.message.findMany({
    where: {
      conversationId,
      ...(afterCreatedAt ? { createdAt: { gt: afterCreatedAt } } : {}),
    },
    include: { sender: { select: { id: true, displayName: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
}

export function findMessageById(id: string) {
  return prisma.message.findUnique({ where: { id } });
}

export async function createMessage(conversationId: string, senderId: string, body: string) {
  const message = await prisma.message.create({
    data: { conversationId, senderId, body },
    include: { sender: { select: { id: true, displayName: true } } },
  });
  // Đẩy conversation lên đầu danh sách chat
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });
  return message;
}

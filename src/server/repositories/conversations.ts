import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";
import { listingInclude } from "@/server/repositories/listings";

export const conversationInclude = {
  listing: { include: listingInclude },
  buyOrder: { include: { card: true } },
  buyer: { select: { id: true, displayName: true, isVip: true } },
  seller: { select: { id: true, displayName: true, isVip: true } },
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

export function findBuyOrderConversationByPair(buyOrderId: string, sellerId: string) {
  return prisma.conversation.findUnique({
    where: { buyOrderId_sellerId: { buyOrderId, sellerId } },
  });
}

/** Mọi hội thoại của 1 tin gom (map sellerId → conversationId trong 1 query). */
export function listBuyOrderConversations(buyOrderId: string) {
  return prisma.conversation.findMany({
    where: { buyOrderId },
    select: { id: true, sellerId: true },
  });
}

export function findOrCreateConversation(listingId: string, buyerId: string, sellerId: string) {
  return prisma.conversation.upsert({
    where: { listingId_buyerId: { listingId, buyerId } },
    update: {},
    // Hội thoại chỉ sinh ra khi seller connect → seller vừa "thấy" nó (mốc =
    // now); buyer chưa đọc (null) để hiện thông báo được match.
    create: { listingId, buyerId, sellerId, sellerLastReadAt: new Date() },
    include: conversationInclude,
  });
}

// Hội thoại riêng từ 1 tin gom: người mua (chủ tin) connect 1 chào bán của
// người bán. Key theo (buyOrderId, sellerId) — 1 hội thoại / cặp. Người bán
// vừa được người mua chọn → seller đã "thấy" (mốc=now); buyer chưa đọc (null).
export function findOrCreateBuyOrderConversation(
  buyOrderId: string,
  buyerId: string,
  sellerId: string
) {
  return prisma.conversation.upsert({
    where: { buyOrderId_sellerId: { buyOrderId, sellerId } },
    update: {},
    create: { buyOrderId, buyerId, sellerId, sellerLastReadAt: new Date() },
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
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    select: {
      id: true,
      buyerId: true,
      sellerId: true,
      buyerLastReadAt: true,
      sellerLastReadAt: true,
    },
  });
}

/** Mọi conversation user tham gia (là buyer, hoặc là seller). */
export function listConversationsForUser(userId: string) {
  return prisma.conversation.findMany({
    where: {
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
    include: {
      ...conversationInclude,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { sender: { select: { id: true, displayName: true, isVip: true } } },
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

/**
 * Đặt hạn xóa chat = purgeAt CHỈ khi chưa đặt (updateMany + điều kiện null →
 * idempotent: rating thứ 2 đặt 1 lần, lần gọi thừa không dời hạn).
 */
export function setMessagesPurgeAt(conversationId: string, purgeAt: Date) {
  return prisma.conversation.updateMany({
    where: { id: conversationId, messagesPurgeAt: null },
    data: { messagesPurgeAt: purgeAt },
  });
}

/** Hội thoại tới hạn xóa nội dung mà chưa xóa (cho sweep). */
export function listConversationsToPurge(now: Date, limit = 50) {
  return prisma.conversation.findMany({
    where: { messagesPurgeAt: { lte: now }, messagesPurgedAt: null },
    select: { id: true },
    take: limit,
  });
}

/**
 * Xóa NỘI DUNG tin nhắn của 1 hội thoại + ghi mốc đã xóa. Giữ conversation
 * shell (trade history + link /me không gãy) — chỉ nội dung messages biến mất.
 */
export async function purgeMessages(conversationId: string): Promise<number> {
  const { count } = await prisma.message.deleteMany({ where: { conversationId } });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { messagesPurgedAt: new Date() },
  });
  return count;
}

export function listMessages(conversationId: string, afterCreatedAt?: Date) {
  return prisma.message.findMany({
    where: {
      conversationId,
      ...(afterCreatedAt ? { createdAt: { gt: afterCreatedAt } } : {}),
    },
    include: { sender: { select: { id: true, displayName: true, isVip: true } } },
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
    include: { sender: { select: { id: true, displayName: true, isVip: true } } },
  });
  // Đẩy conversation lên đầu danh sách chat
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });
  return message;
}

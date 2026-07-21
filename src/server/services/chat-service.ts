import { ApiError } from "@/server/errors";
import * as conversations from "@/server/repositories/conversations";
import { toCardDto, toListingDto, toMessageDto } from "@/server/serializers";
import type { ConversationDto, MessageDto } from "@/lib/types";
import type { ConversationWithRelations } from "@/server/repositories/conversations";

/** Thành viên hợp lệ của conversation = buyer hoặc seller (lưu trực tiếp). */
function assertMember(conversation: ConversationWithRelations, userId: string) {
  const isMember =
    conversation.buyerId === userId || conversation.sellerId === userId;
  if (!isMember) {
    throw new ApiError(403, "FORBIDDEN", "Bạn không tham gia đoạn chat này.");
  }
}

function toConversationDto(
  conversation: ConversationWithRelations & {
    messages?: Parameters<typeof toMessageDto>[0][];
    trades?: { id: string }[];
  },
  viewerId: string,
  unreadCount: number
): ConversationDto {
  const otherParty =
    conversation.buyerId === viewerId ? conversation.seller : conversation.buyer;
  const last = conversation.messages?.[0] ?? null;
  const base = {
    id: conversation.id,
    buyerId: conversation.buyerId,
    otherPartyId: otherParty.id,
    otherPartyName: otherParty.displayName,
    otherPartyIsVip: otherParty.isVip,
    lastMessage: last ? toMessageDto(last) : null,
    unreadCount,
    activeTradeId: conversation.trades?.[0]?.id ?? null,
    // Nội dung tin nhắn đã bị xóa (1 ngày sau khi trade + đánh giá xong) →
    // UI hiện thông báo thay danh sách tin, khóa ô nhập.
    messagesPurged: conversation.messagesPurgedAt !== null,
    updatedAt: conversation.updatedAt.toISOString(),
  };
  // Hội thoại từ listing hoặc từ tin gom — xây DTO trong nhánh tương ứng để
  // card/listing/buyOrder có kiểu trung thực (union phân biệt theo kind).
  if (conversation.buyOrder) {
    return {
      ...base,
      kind: "buy_order",
      card: toCardDto(conversation.buyOrder.card),
      listing: null,
      buyOrder: {
        id: conversation.buyOrder.id,
        quantity: conversation.buyOrder.quantity,
        maxUnitPriceJpy: conversation.buyOrder.maxUnitPriceJpy,
      },
    };
  }
  if (conversation.listing) {
    return {
      ...base,
      kind: "listing",
      card: toCardDto(conversation.listing.card),
      listing: toListingDto(conversation.listing),
      buyOrder: null,
    };
  }
  // Bất biến dữ liệu: hội thoại luôn sinh từ listing hoặc buy-order.
  throw new Error(`conversation ${conversation.id} has neither listing nor buy order`);
}

/**
 * Sweep xóa nội dung chat tới hạn (throttle 1 lần/phút/process, giống
 * auto-close trade). Gọi lazy ở listMine thay cho cron. Xóa messages của các
 * hội thoại có messagesPurgeAt <= now và chưa xóa; conversation shell ở lại.
 */
const PURGE_CHECK_INTERVAL_MS = 60_000;
let nextPurgeCheckAt = 0;

export function __resetPurgeThrottle() {
  nextPurgeCheckAt = 0;
}

export async function purgeExpiredChatsThrottled(): Promise<number> {
  const now = Date.now();
  if (now < nextPurgeCheckAt) return 0;
  nextPurgeCheckAt = now + PURGE_CHECK_INTERVAL_MS;
  return purgeExpiredChats();
}

export async function purgeExpiredChats(): Promise<number> {
  const due = await conversations.listConversationsToPurge(new Date());
  for (const { id } of due) {
    const count = await conversations.purgeMessages(id);
    console.log(`[chat] purged ${count} messages of conversation ${id} (trade + rating done)`);
  }
  return due.length;
}

export async function listMine(userId: string): Promise<ConversationDto[]> {
  await purgeExpiredChatsThrottled();
  const rows = await conversations.listConversationsForUser(userId);
  // Đếm chưa đọc từng hội thoại — cùng quy tắc với getUnreadCount (mốc null
  // tính tối thiểu 1). Vòng lặp count/hội thoại: đủ cho MVP, số lượng nhỏ.
  return Promise.all(
    rows.map(async (row) => {
      const myLastRead = row.buyerId === userId ? row.buyerLastReadAt : row.sellerLastReadAt;
      const unread = await conversations.countUnreadMessages(row.id, userId, myLastRead);
      return toConversationDto(row, userId, myLastRead === null ? Math.max(unread, 1) : unread);
    })
  );
}

/**
 * Tổng số tin chưa đọc để hiện huy hiệu ở nav. Với mỗi hội thoại: đếm tin của
 * bên kia gửi sau mốc "đã đọc" của mình. Hội thoại chưa mở lần nào (mốc null)
 * tính tối thiểu 1 — để báo "được match" ngay cả khi chưa có tin nhắn.
 * (Vòng lặp count/hội thoại: đủ cho MVP, số hội thoại/user nhỏ.)
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const rows = await conversations.listConversationsWithReadState(userId);
  let total = 0;
  for (const row of rows) {
    const isBuyer = row.buyerId === userId;
    const myLastRead = isBuyer ? row.buyerLastReadAt : row.sellerLastReadAt;
    const unread = await conversations.countUnreadMessages(row.id, userId, myLastRead);
    total += myLastRead === null ? Math.max(unread, 1) : unread;
  }
  return total;
}

/** Đánh dấu 1 hội thoại là đã đọc cho user (khi mở/đang xem). */
export async function markRead(userId: string, conversationId: string): Promise<void> {
  const conversation = await conversations.findConversationById(conversationId);
  if (!conversation) {
    throw new ApiError(404, "NOT_FOUND", "Không tìm thấy đoạn chat.");
  }
  assertMember(conversation, userId);
  const role = conversation.buyerId === userId ? "buyer" : "seller";
  await conversations.markConversationRead(conversationId, role);
}

export async function getMessages(
  userId: string,
  conversationId: string,
  afterMessageId?: string
): Promise<MessageDto[]> {
  const conversation = await conversations.findConversationById(conversationId);
  if (!conversation) {
    throw new ApiError(404, "NOT_FOUND", "Không tìm thấy đoạn chat.");
  }
  assertMember(conversation, userId);

  let afterCreatedAt: Date | undefined;
  if (afterMessageId) {
    const anchor = await conversations.findMessageById(afterMessageId);
    if (anchor && anchor.conversationId === conversationId) {
      afterCreatedAt = anchor.createdAt;
    }
  }
  const messages = await conversations.listMessages(conversationId, afterCreatedAt);
  return messages.map(toMessageDto);
}

export async function sendMessage(
  userId: string,
  conversationId: string,
  body: string
): Promise<MessageDto> {
  const conversation = await conversations.findConversationById(conversationId);
  if (!conversation) {
    throw new ApiError(404, "NOT_FOUND", "Không tìm thấy đoạn chat.");
  }
  assertMember(conversation, userId);
  const message = await conversations.createMessage(conversationId, userId, body);
  // Người gửi coi như đã đọc tới thời điểm này (không tự tính tin mình gửi).
  const role = conversation.buyerId === userId ? "buyer" : "seller";
  await conversations.markConversationRead(conversationId, role);
  return toMessageDto(message);
}

export async function getMembership(userId: string, conversationId: string) {
  const conversation = await conversations.findConversationById(conversationId);
  if (!conversation) {
    throw new ApiError(404, "NOT_FOUND", "Không tìm thấy đoạn chat.");
  }
  assertMember(conversation, userId);
  return conversation;
}

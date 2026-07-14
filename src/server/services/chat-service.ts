import { ApiError } from "@/server/errors";
import * as conversations from "@/server/repositories/conversations";
import { toListingDto, toMessageDto } from "@/server/serializers";
import type { ConversationDto, MessageDto } from "@/lib/types";
import type { ConversationWithRelations } from "@/server/repositories/conversations";

/** Thành viên hợp lệ của conversation = buyer hoặc seller của listing. */
function assertMember(conversation: ConversationWithRelations, userId: string) {
  const isMember =
    conversation.buyerId === userId || conversation.listing.sellerId === userId;
  if (!isMember) {
    throw new ApiError(403, "FORBIDDEN", "このチャットに参加していません。");
  }
}

function toConversationDto(
  conversation: ConversationWithRelations & {
    messages?: Parameters<typeof toMessageDto>[0][];
    trades?: { id: string }[];
  },
  viewerId: string
): ConversationDto {
  const otherParty =
    conversation.buyerId === viewerId
      ? conversation.listing.seller
      : conversation.buyer;
  const last = conversation.messages?.[0] ?? null;
  return {
    id: conversation.id,
    listing: toListingDto(conversation.listing),
    buyerId: conversation.buyerId,
    otherPartyName: otherParty.displayName,
    lastMessage: last ? toMessageDto(last) : null,
    activeTradeId: conversation.trades?.[0]?.id ?? null,
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

export async function listMine(userId: string): Promise<ConversationDto[]> {
  const rows = await conversations.listConversationsForUser(userId);
  return rows.map((row) => toConversationDto(row, userId));
}

export async function getMessages(
  userId: string,
  conversationId: string,
  afterMessageId?: string
): Promise<MessageDto[]> {
  const conversation = await conversations.findConversationById(conversationId);
  if (!conversation) {
    throw new ApiError(404, "NOT_FOUND", "チャットが見つかりません。");
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
    throw new ApiError(404, "NOT_FOUND", "チャットが見つかりません。");
  }
  assertMember(conversation, userId);
  const message = await conversations.createMessage(conversationId, userId, body);
  return toMessageDto(message);
}

export async function getMembership(userId: string, conversationId: string) {
  const conversation = await conversations.findConversationById(conversationId);
  if (!conversation) {
    throw new ApiError(404, "NOT_FOUND", "チャットが見つかりません。");
  }
  assertMember(conversation, userId);
  return conversation;
}

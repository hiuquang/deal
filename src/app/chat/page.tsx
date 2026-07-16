"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import type { ConversationDto } from "@/lib/types";
import { cardTitle, formatJpy } from "@/lib/labels";
import { useAuth } from "@/components/auth-context";
import { ChatPanel } from "@/components/chat-panel";
import { TradePanel } from "@/components/trade-panel";
import { Empty, Loading, SafetyNote } from "@/components/ui";
import { UNREAD_EVENT } from "@/components/nav-bar";
import { useI18n } from "@/lib/i18n";

function ChatContent() {
  const { me, loading } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("c");
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const { conversations } = await api.listConversations();
      setConversations(conversations);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (me) void reload();
  }, [me, reload]);

  // Mở 1 hội thoại = đã đọc → gọi API đánh dấu rồi báo nav cập nhật huy hiệu.
  const markRead = useCallback((conversationId: string) => {
    void api
      .markConversationRead(conversationId)
      .then(() => window.dispatchEvent(new Event(UNREAD_EVENT)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (me && selectedId) markRead(selectedId);
  }, [me, selectedId, markRead]);

  // Callback ổn định (chỉ đổi khi selectedId đổi) để không reset ChatPanel mỗi render.
  const handleIncoming = useCallback(() => {
    if (selectedId) markRead(selectedId);
  }, [selectedId, markRead]);

  if (loading || (me && !loaded)) return <Loading />;
  if (!me) {
    return (
      <div className="py-12 text-center text-sm text-slate-600">
        {t("chat.loginPrompt")}{" "}
        <Link href="/login" className="text-indigo-600 hover:underline">
          {t("nav.login")}
        </Link>
      </div>
    );
  }

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="grid h-[calc(100vh-10rem)] grid-cols-1 overflow-hidden rounded-xl border border-slate-200 bg-white md:grid-cols-[280px_1fr]">
      <aside
        className={`overflow-y-auto border-slate-200 md:border-r ${selected ? "hidden md:block" : ""}`}
      >
        {conversations.length === 0 ? (
          <div className="p-4">
            <Empty message={t("chat.none")} />
          </div>
        ) : (
          <ul>
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <button
                  onClick={() => router.push(`/chat?c=${conversation.id}`)}
                  className={`w-full border-b border-slate-100 px-3 py-3 text-left hover:bg-slate-50 ${
                    conversation.id === selectedId ? "bg-indigo-50" : ""
                  }`}
                >
                  <p className="line-clamp-1 text-sm font-medium">
                    {conversation.kind === "buy_order" && (
                      <span className="mr-1 rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-700">
                        {t("chat.buyOrderTag")}
                      </span>
                    )}
                    {conversation.card.nameJa}
                  </p>
                  <p className="text-xs text-slate-500">
                    {conversation.otherPartyName}・
                    {conversation.kind === "buy_order"
                      ? t("chat.buyOrderQty", { n: conversation.buyOrder!.quantity })
                      : formatJpy(conversation.listing!.askingPriceJpy)}
                  </p>
                  {conversation.lastMessage && (
                    <p className="line-clamp-1 text-xs text-slate-400">
                      {conversation.lastMessage.body}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className={`flex flex-col ${selected ? "" : "hidden md:flex"}`}>
        {selected ? (
          <>
            <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
              <button
                onClick={() => router.push("/chat")}
                className="text-sm text-slate-400 md:hidden"
                aria-label={t("chat.back")}
              >
                ←
              </button>
              <div className="min-w-0">
                <Link
                  href={
                    selected.kind === "buy_order"
                      ? `/buy-orders/${selected.buyOrder!.id}`
                      : `/listings/${selected.listing!.id}`
                  }
                  className="line-clamp-1 text-sm font-semibold hover:text-indigo-600"
                >
                  {selected.kind === "buy_order" && (
                    <span className="mr-1 rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-700">
                      {t("chat.buyOrderTag")}
                    </span>
                  )}
                  {cardTitle(selected.card)}
                </Link>
                <p className="text-xs text-slate-500">
                  {t("chat.partner", { name: selected.otherPartyName })}
                </p>
              </div>
            </div>
            <div className="border-b border-red-100 bg-red-50/50 px-3 py-1.5">
              <SafetyNote messageKey="safety.chat" />
            </div>
            <ChatPanel
              conversationId={selected.id}
              myUserId={me.id}
              onIncoming={handleIncoming}
            />
            {/* Trade/ghi giá mới hỗ trợ hội thoại từ listing (Giai đoạn 1). */}
            {selected.kind === "listing" && (
              <TradePanel conversation={selected} myUserId={me.id} onTradeChange={reload} />
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
            {t("chat.selectPrompt")}
          </div>
        )}
      </section>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ChatContent />
    </Suspense>
  );
}

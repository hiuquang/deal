"use client";

// Khung chat 1 conversation — polling tin nhắn mới mỗi 6 giây, CHỈ khi tab
// đang hiển thị (tab ẩn/thu nhỏ thì ngừng — tiết kiệm phần lớn request khi
// nhiều người treo tab); quay lại tab là poll bù ngay. MVP dùng polling thay
// WebSocket (design.md).
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiClientError } from "@/lib/api-client";
import type { MessageDto } from "@/lib/types";
import { formatDateTime } from "@/lib/labels";
import { useI18n } from "@/lib/i18n";
import { ErrorBox } from "@/components/ui";

const POLL_MS = 6000;

export function ChatPanel({
  conversationId,
  myUserId,
  onIncoming,
}: {
  conversationId: string;
  myUserId: string;
  /** Gọi khi có tin mới của đối phương lúc đang xem → đánh dấu đã đọc. */
  onIncoming?: () => void;
}) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | undefined>(undefined);

  const poll = useCallback(async () => {
    try {
      const { messages: incoming } = await api.getMessages(
        conversationId,
        lastIdRef.current
      );
      if (incoming.length > 0) {
        lastIdRef.current = incoming[incoming.length - 1].id;
        // Dedupe theo id: 2 poll chạy đồng thời có thể trả cùng tin nhắn mới
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...incoming.filter((m) => !seen.has(m.id))];
        });
        // Có tin của đối phương lúc đang xem → đánh dấu đã đọc, huy hiệu giữ 0.
        if (incoming.some((m) => m.senderId !== myUserId)) onIncoming?.();
      }
    } catch {
      // lỗi polling tạm thời — thử lại ở tick sau
    }
  }, [conversationId, myUserId, onIncoming]);

  useEffect(() => {
    setMessages([]);
    setError(null);
    lastIdRef.current = undefined;
    void poll();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void poll();
    }, POLL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [poll]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    try {
      await api.sendMessage(conversationId, body);
      setDraft("");
      setError(null);
      await poll();
    } catch (err) {
      // Giữ nguyên draft để user bấm gửi lại
      setError(err instanceof ApiClientError ? err.message : t("chat.sendFail"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="py-8 text-center text-xs text-slate-400">{t("chat.firstMsg")}</p>
        )}
        {messages.map((message) => {
          const mine = message.senderId === myUserId;
          return (
            <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-800"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{message.body}</p>
                <p className={`mt-0.5 text-[10px] ${mine ? "text-indigo-200" : "text-slate-400"}`}>
                  {formatDateTime(message.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {error && (
        <div className="border-t border-slate-200 px-3 pt-3">
          <ErrorBox message={error} />
        </div>
      )}
      <form onSubmit={handleSend} className={`flex gap-2 p-3 ${error ? "" : "border-t border-slate-200"}`}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={1000}
          placeholder={t("chat.placeholder")}
          aria-label={t("chat.placeholder")}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {t("chat.send")}
        </button>
      </form>
    </div>
  );
}

"use client";

// Khung chat 1 conversation — polling THÔNG MINH: nhịp poll tự điều chỉnh
// theo mức tương tác (đang gõ/chạm → 5s; im ắng → giãn dần 15s/60s), CHỈ khi
// tab đang hiển thị. Đối phương nhắn tới hoặc quay lại tab → bật lại nhịp
// nhanh ngay. Giảm ~60-70% request so với poll cứng 6s mà cảm giác chat gần
// như không đổi. MVP dùng polling thay WebSocket (roadmap: Supabase Realtime).
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiClientError } from "@/lib/api-client";
import type { MessageDto } from "@/lib/types";
import { formatDateTime } from "@/lib/labels";
import { useI18n } from "@/lib/i18n";
import { ErrorBox } from "@/components/ui";

// Nhịp poll theo mức tương tác. Trường hợp xấu nhất: cả 2 bên treo tab >5
// phút thì tin đầu tiên tới trễ tối đa ~60s — chấp nhận được với chợ trade
// (badge nav cũng báo song song); ngay khi thấy tin là quay lại nhịp 5s.
const POLL_ACTIVE_MS = 5_000; // có tương tác trong 1 phút gần nhất
const POLL_RECENT_MS = 15_000; // im ắng 1–5 phút
const POLL_IDLE_MS = 60_000; // treo >5 phút
const ACTIVE_WINDOW_MS = 60_000;
const RECENT_WINDOW_MS = 5 * 60_000;

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
  const listRef = useRef<HTMLDivElement>(null);
  // true = user đang ở (gần) đáy → tin mới tự cuộn xuống. Khi user cuộn lên
  // đọc lịch sử thì KHÔNG giật xuống đáy mỗi lần poll có tin mới.
  const stickToBottomRef = useRef(true);
  const lastIdRef = useRef<string | undefined>(undefined);
  // Mốc tương tác cuối (gõ, chạm, cuộn, gửi, nhận tin) — quyết định nhịp poll.
  const lastActivityRef = useRef(Date.now());

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const poll = useCallback(async () => {
    try {
      const { messages: incoming } = await api.getMessages(
        conversationId,
        lastIdRef.current
      );
      if (incoming.length > 0) {
        lastIdRef.current = incoming[incoming.length - 1].id;
        // Đo vị trí NGAY TRƯỚC khi thêm tin (DOM chưa đổi): user đang bám đáy
        // thì tin mới tự cuộn xuống; đang cuộn lên đọc lịch sử thì giữ nguyên.
        // Đo tại đây thay vì nghe sự kiện scroll — đáng tin hơn (scroll event
        // không phát khi tab ẩn/scroll bằng JS).
        const el = listRef.current;
        stickToBottomRef.current =
          !el || el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        // Dedupe theo id: 2 poll chạy đồng thời có thể trả cùng tin nhắn mới
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...incoming.filter((m) => !seen.has(m.id))];
        });
        // Có tin của đối phương lúc đang xem → đánh dấu đã đọc, huy hiệu giữ
        // 0; đồng thời tính là tương tác (họ đang nói chuyện với mình) → giữ
        // nhịp poll nhanh cho cuộc hội thoại mượt.
        if (incoming.some((m) => m.senderId !== myUserId)) {
          markActivity();
          onIncoming?.();
        }
      }
    } catch {
      // lỗi polling tạm thời — thử lại ở tick sau
    }
  }, [conversationId, myUserId, onIncoming, markActivity]);

  useEffect(() => {
    setMessages([]);
    setError(null);
    lastIdRef.current = undefined;
    stickToBottomRef.current = true;
    lastActivityRef.current = Date.now(); // mở hội thoại = đang tương tác
    void poll();
    // Chuỗi setTimeout thay setInterval: mỗi tick tự chọn delay theo mức
    // tương tác hiện tại (5s/15s/60s). Tab ẩn thì bỏ qua tick (không request).
    const pollDelay = () => {
      const idle = Date.now() - lastActivityRef.current;
      if (idle < ACTIVE_WINDOW_MS) return POLL_ACTIVE_MS;
      if (idle < RECENT_WINDOW_MS) return POLL_RECENT_MS;
      return POLL_IDLE_MS;
    };
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (stopped) return;
      timer = setTimeout(async () => {
        if (document.visibilityState === "visible") await poll();
        tick();
      }, pollDelay());
    };
    tick();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        lastActivityRef.current = Date.now(); // quay lại tab = tương tác
        void poll();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [poll]);

  // Cuộn TRONG container (không scrollIntoView — nó kéo cả trang, trên iPhone
  // gây giật với thanh URL). Chỉ tự cuộn khi user đang bám đáy.
  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    markActivity();
    setBusy(true);
    try {
      await api.sendMessage(conversationId, body);
      setDraft("");
      setError(null);
      await poll();
      // Tự gửi tin thì luôn cuộn xuống đáy, kể cả đang xem lịch sử phía trên
      // (đặt SAU poll — poll đo vị trí có thể tắt cờ bám đáy).
      stickToBottomRef.current = true;
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    } catch (err) {
      // Giữ nguyên draft để user bấm gửi lại
      setError(err instanceof ApiClientError ? err.message : t("chat.sendFail"));
    } finally {
      setBusy(false);
    }
  }

  return (
    // min-h-0 (không phải h-full): cho phép khung co lại trong flex column —
    // thiếu nó min-height:auto giữ khung cao bằng toàn bộ tin nhắn → tràn khỏi
    // overflow-hidden bên ngoài, tin cũ bị cắt cụt không cuộn lên xem được.
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={listRef}
        onScroll={markActivity}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3"
      >
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
      </div>
      {error && (
        <div className="shrink-0 border-t border-slate-200 px-3 pt-3">
          <ErrorBox message={error} />
        </div>
      )}
      <form
        onSubmit={handleSend}
        className={`flex shrink-0 gap-2 p-3 ${error ? "" : "border-t border-slate-200"}`}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => {
            markActivity();
            setDraft(e.target.value);
          }}
          onFocus={markActivity}
          maxLength={1000}
          placeholder={t("chat.placeholder")}
          aria-label={t("chat.placeholder")}
          // text-base (16px) trên mobile: iOS Safari tự phóng to trang khi focus
          // input có font < 16px — nguyên nhân vỡ layout chat trên iPhone.
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-indigo-500 focus:outline-none sm:text-sm"
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

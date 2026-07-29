"use client";

// Bình luận công khai dưới tin BÁN hoặc tin ĐĂNG MUA (v0.24.0): ai cũng đọc,
// đăng nhập mới viết. Cùng một component, chỉ khác target truyền vào.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api-client";
import type { CommentDto } from "@/lib/types";
import type { CommentTarget } from "@/lib/comment-target";
import { formatDateTime } from "@/lib/labels";
import { useAuth } from "@/components/auth-context";
import { ErrorBox, VipName } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

export function CommentsSection({ target }: { target: CommentTarget }) {
  const { me } = useAuth();
  const { t } = useI18n();
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { comments } = await api.listComments(target);
      setComments(comments);
    } catch {
      // lỗi tải tạm thời — giữ danh sách cũ
    }
  }, [target.kind, target.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.postComment(target, draft.trim());
      setDraft("");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("cmt.postFail"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-bold">
        {t("cmt.title")} <span className="font-normal text-slate-400">({comments.length})</span>
      </h2>

      {comments.length === 0 ? (
        <p className="py-2 text-xs text-slate-400">{t("cmt.none")}</p>
      ) : (
        <ul className="space-y-2">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-indigo-700">
                  <VipName name={comment.userDisplayName} isVip={comment.userIsVip} />
                </span>
                <span className="text-[10px] text-slate-400">
                  {formatDateTime(comment.createdAt)}
                </span>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm">{comment.body}</p>
            </li>
          ))}
        </ul>
      )}

      {error && <ErrorBox message={error} />}
      {me ? (
        <form onSubmit={handlePost} className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={500}
            placeholder={t("cmt.placeholder")}
            aria-label={t("cmt.title")}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="shrink-0 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {t("cmt.post")}
          </button>
        </form>
      ) : (
        <p className="text-xs text-slate-500">
          {t("cmt.loginPrefix")}{" "}
          <Link href="/login" className="text-indigo-600 hover:underline">
            {t("buy.loginLink")}
          </Link>
          {t("buy.loginSuffix")}
        </p>
      )}
    </section>
  );
}

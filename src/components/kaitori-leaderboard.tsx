"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    twttr?: { widgets?: { load: (el?: HTMLElement) => void } };
  }
}

export interface LeaderboardPost {
  postId: string;
  handle: string;
  shopName: string;
  /** "¥5,200,000" — null khi bài chỉ có bảng giá trong ảnh, chưa đọc được. */
  price: string | null;
  card: string | null;
  /** Định dạng sẵn ở server ("3 giờ trước") — định dạng ở client là lệch hydration. */
  ago: string;
}

/** Màu huy chương theo hạng: vàng logo → bạc → đồng → trung tính. */
const MEDAL = [
  "bg-gold-500 text-white ring-4 ring-gold-400/30",
  "bg-slate-400 text-white ring-4 ring-slate-300/40",
  "bg-orange-400 text-white ring-4 ring-orange-300/30",
  "bg-brand-100 text-brand-700",
];

let widgetsPromise: Promise<void> | null = null;

/**
 * Tải widgets.js của X MỘT lần. Bài gốc MỞ SẴN ngay khi vào trang (chủ web
 * 2026-10-27: người xem phải thấy bảng giá của shop luôn, không phải bấm).
 * X có lỗi/bị chặn thì bảng xếp hạng vẫn nguyên, chỉ còn link sang X.
 */
function ensureWidgets(): Promise<void> {
  if (window.twttr?.widgets) return Promise.resolve();
  if (!widgetsPromise) {
    widgetsPromise = new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "https://platform.twitter.com/widgets.js";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        widgetsPromise = null; // cho thử lại ở lần mở sau
        resolve();
      };
      document.body.appendChild(s);
    });
  }
  return widgetsPromise;
}

function PostCard({ post, rank }: { post: LeaderboardPost; rank: number }) {
  return (
    <li className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-4 p-4 sm:p-5">
        <span
          aria-label={`Hạng ${rank}`}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-black ${MEDAL[Math.min(rank - 1, 3)]}`}
        >
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          {post.price ? (
            <p className="text-2xl font-black tabular-nums tracking-tight text-slate-900 sm:text-3xl">
              {post.price}
            </p>
          ) : (
            <p className="text-lg font-bold text-slate-500">Bảng giá trong ảnh</p>
          )}
          {post.card && <p className="truncate text-sm font-medium text-slate-700">{post.card}</p>}
          <p className="mt-1 text-xs text-slate-400">
            {post.shopName} · {post.ago}
          </p>
        </div>
      </div>

      {/* `open` sẵn; vẫn gập lại được nếu người xem muốn bảng gọn. */}
      <details open className="group border-t border-slate-100">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50 sm:px-5 [&::-webkit-details-marker]:hidden">
          Xem bài gốc trên X
          <span aria-hidden className="text-slate-400 transition group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="px-4 pb-4 sm:px-5">
          {/* widgets.js thay blockquote bằng khung nhúng chính thức của X;
              script bị chặn thì vẫn còn link sang X. */}
          <blockquote className="twitter-tweet" data-dnt="true" data-lang="ja" data-conversation="none">
            <a
              href={`https://twitter.com/${post.handle}/status/${post.postId}`}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              Mở bài của {post.shopName} trên X ↗
            </a>
          </blockquote>
        </div>
      </details>
    </li>
  );
}

export function KaitoriLeaderboard({ posts }: { posts: LeaderboardPost[] }) {
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    let cancelled = false;
    ensureWidgets().then(() => {
      if (!cancelled) window.twttr?.widgets?.load(listRef.current ?? undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [posts]);

  return (
    <ol ref={listRef} className="grid items-start gap-3 sm:grid-cols-2">
      {posts.map((post, i) => (
        <PostCard key={post.postId} post={post} rank={i + 1} />
      ))}
    </ol>
  );
}

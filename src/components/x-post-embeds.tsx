"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    twttr?: { widgets?: { load: (el?: HTMLElement) => void } };
  }
}

export interface EmbedPost {
  postId: string;
  handle: string;
  shopName: string;
  /** Định dạng sẵn ở server (giờ JST) — định dạng ở client là lệch hydration. */
  timeLabel: string;
}

/**
 * Khung nhúng chính thức của X. DEAL chỉ đưa ra một <blockquote> chứa LINK;
 * widgets.js của X thay nó bằng iframe do X tự vẽ (chữ, ảnh, nút) — ta không
 * chép nội dung nào. Bị trình chặn quảng cáo chặn script thì blockquote vẫn còn
 * nguyên: tên shop + giờ đăng + link sang X, vẫn dùng được.
 *
 * `data-dnt`: xin X không dùng lượt xem này để cá nhân hóa quảng cáo.
 */
export function XPostEmbeds({ posts }: { posts: EmbedPost[] }) {
  const ref = useRef<HTMLDivElement>(null);

  // Đổi vùng là đổi route → component dựng lại → quét lại blockquote mới.
  // Script đã tải từ trang trước thì `onLoad` không chạy nữa, nên phải gọi tay.
  useEffect(() => {
    window.twttr?.widgets?.load(ref.current ?? undefined);
  }, [posts]);

  return (
    <>
      <div ref={ref} className="grid items-start gap-4 sm:grid-cols-2">
        {posts.map((post) => (
          <blockquote
            key={post.postId}
            className="twitter-tweet rounded-xl border border-slate-200 bg-white p-4 text-sm"
            data-dnt="true"
            data-lang="ja"
            data-conversation="none"
          >
            <p className="font-bold text-slate-900">{post.shopName}</p>
            <p className="mt-0.5 text-slate-500">
              @{post.handle} · {post.timeLabel}
            </p>
            {/* widgets.js lấy LINK CUỐI CÙNG trong blockquote làm bài cần nhúng. */}
            <a
              href={`https://twitter.com/${post.handle}/status/${post.postId}`}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mt-2 inline-block font-medium text-brand-600 hover:underline"
            >
              Xem bài trên X ↗
            </a>
          </blockquote>
        ))}
      </div>
      <Script
        src="https://platform.twitter.com/widgets.js"
        strategy="lazyOnload"
        onLoad={() => window.twttr?.widgets?.load(ref.current ?? undefined)}
      />
    </>
  );
}

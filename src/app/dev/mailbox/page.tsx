"use client";

// Hộp thư DEV: xem email "gửi đi" khi chưa cấu hình SMTP (chỉ môi trường dev).
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Empty, Loading } from "@/components/ui";
import { formatDateTime } from "@/lib/labels";

type DevEmail = { id: string; to: string; subject: string; body: string; createdAt: string };

function linkify(body: string) {
  return body.split(/(https?:\/\/\S+)/g).map((part, i) =>
    part.startsWith("http") ? (
      <a key={i} href={part} className="break-all text-indigo-600 underline">
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function DevMailboxPage() {
  const [emails, setEmails] = useState<DevEmail[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .devMailbox()
      .then(({ emails }) => setEmails(emails))
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <Empty message="Màn hình này chỉ dùng cho môi trường phát triển (đã cấu hình SMTP · vô hiệu ở production)." />
    );
  }
  if (!emails) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
        🛠 <strong>Hộp thư dev</strong> — SMTP chưa cấu hình nên email gửi đi sẽ hiện ở đây.
        Ở production, email sẽ gửi tới địa chỉ thật.
      </div>
      <h1 className="text-xl font-bold">Hộp thư đến ({emails.length})</h1>
      {emails.length === 0 ? (
        <Empty message="Chưa có email nào. Khi đăng ký mới, email xác nhận sẽ hiện ở đây." />
      ) : (
        <ul className="space-y-3">
          {emails.map((mail) => (
            <li key={mail.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-bold">{mail.subject}</p>
                <p className="text-xs text-slate-400">
                  Đến: {mail.to}·{formatDateTime(mail.createdAt)}
                </p>
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-700">
                {linkify(mail.body)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

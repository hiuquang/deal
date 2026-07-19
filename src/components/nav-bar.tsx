"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/auth-context";
import { VipBadge } from "@/components/ui";
import { LOCALE_OPTIONS, useI18n } from "@/lib/i18n";

const UNREAD_POLL_MS = 15000;
/** Sự kiện để chat page báo nav refetch ngay sau khi đánh dấu đã đọc. */
export const UNREAD_EVENT = "deal:unread";

function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const current = LOCALE_OPTIONS.find((option) => option.value === locale)!;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        aria-label="Language"
        className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100"
      >
        <span>{current.flag}</span>
        <span className="hidden sm:inline">{current.label}</span>
        <span className="text-[10px] text-slate-400">▼</span>
      </button>
      {open && (
        <ul className="absolute right-0 z-30 mt-1 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {LOCALE_OPTIONS.map((option) => (
            <li key={option.value}>
              <button
                onMouseDown={() => {
                  setLocale(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-indigo-50 ${
                  option.value === locale ? "bg-indigo-50 font-semibold text-indigo-700" : ""
                }`}
              >
                <span>{option.flag}</span> {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UnreadBadge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={label}
      className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function NavBar() {
  const { me, loading, logout } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const refreshUnread = useCallback(async () => {
    if (!me) {
      setUnread(0);
      return;
    }
    try {
      const { count } = await api.unreadCount();
      setUnread(count);
    } catch {
      // lỗi tạm thời — giữ số cũ, thử lại ở lần poll sau
    }
  }, [me]);

  // Poll định kỳ + khi quay lại tab + khi đổi trang (mở/đóng chat) + khi chat
  // page phát sự kiện sau lúc đánh dấu đã đọc → huy hiệu cập nhật gần như tức thì.
  useEffect(() => {
    void refreshUnread();
    if (!me) return;
    const timer = setInterval(refreshUnread, UNREAD_POLL_MS);
    const onFocus = () => refreshUnread();
    const onEvent = () => refreshUnread();
    window.addEventListener("focus", onFocus);
    window.addEventListener(UNREAD_EVENT, onEvent);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(UNREAD_EVENT, onEvent);
    };
  }, [me, refreshUnread]);

  // Đổi route (vd vào/ra trang chat) → cập nhật lại số, đóng menu mobile.
  useEffect(() => {
    void refreshUnread();
    setMenuOpen(false);
  }, [pathname, refreshUnread]);

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    router.push("/");
    router.refresh();
  }

  const unreadLabel = t("nav.unreadAria", { n: unread });

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-4">
        <Link href="/" className="flex min-w-0 shrink items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="DEAL" className="h-10 w-auto shrink-0 sm:h-12" />
          <span className="hidden text-xs text-slate-500 md:inline">{t("nav.tagline")}</span>
        </Link>

        {/* Desktop: các mục nằm ngang. Ẩn dưới sm vì tổng bề rộng vượt màn hình
            điện thoại — chữ Nhật không có dấu cách nên sẽ bị ngắt dọc từng ký tự. */}
        <nav className="hidden items-center gap-1 whitespace-nowrap text-sm sm:flex">
          <Link href="/" className="rounded-md px-3 py-1.5 hover:bg-slate-100">
            {t("nav.browse")}
          </Link>
          <Link href="/listings/new" className="rounded-md px-3 py-1.5 hover:bg-slate-100">
            {t("nav.sell")}
          </Link>
          <Link href="/buy-orders" className="rounded-md px-3 py-1.5 hover:bg-slate-100">
            {t("nav.buyOrders")}
          </Link>
          {me && (
            <Link href="/chat" className="relative rounded-md px-3 py-1.5 hover:bg-slate-100">
              {t("nav.chat")}
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5">
                  <UnreadBadge count={unread} label={unreadLabel} />
                </span>
              )}
            </Link>
          )}
          {loading ? (
            <span className="px-3 text-slate-400">…</span>
          ) : me ? (
            <>
              <Link
                href="/me"
                className="flex max-w-[10rem] items-center rounded-md px-3 py-1.5 font-medium text-indigo-700 hover:bg-indigo-50"
              >
                <span className="truncate">{me.displayName}</span>
                {me.isVip && <VipBadge />}
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-md px-3 py-1.5 text-slate-500 hover:bg-slate-100"
              >
                {t("nav.logout")}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-md px-3 py-1.5 hover:bg-slate-100">
                {t("nav.login")}
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700"
              >
                {t("nav.register")}
              </Link>
            </>
          )}
          <LanguageSwitcher />
        </nav>

        {/* Mobile: chỉ cờ ngôn ngữ + nút menu. */}
        <div className="flex shrink-0 items-center gap-1 sm:hidden">
          <LanguageSwitcher />
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={t("nav.menu")}
            aria-expanded={menuOpen}
            className="relative rounded-md p-2 text-slate-700 hover:bg-slate-100"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              aria-hidden="true"
            >
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
            {/* Menu đóng thì huy hiệu số bị giấu → chấm đỏ báo còn tin chưa đọc. */}
            {!menuOpen && unread > 0 && (
              <span
                aria-label={unreadLabel}
                className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500"
              />
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-slate-200 bg-white px-4 pb-3 text-sm sm:hidden">
          <Link href="/" className="block rounded-md px-2 py-2.5 hover:bg-slate-100">
            {t("nav.browse")}
          </Link>
          <Link href="/listings/new" className="block rounded-md px-2 py-2.5 hover:bg-slate-100">
            {t("nav.sell")}
          </Link>
          <Link href="/buy-orders" className="block rounded-md px-2 py-2.5 hover:bg-slate-100">
            {t("nav.buyOrders")}
          </Link>
          {me && (
            <Link
              href="/chat"
              className="flex items-center gap-2 rounded-md px-2 py-2.5 hover:bg-slate-100"
            >
              {t("nav.chat")}
              <UnreadBadge count={unread} label={unreadLabel} />
            </Link>
          )}
          {loading ? (
            <span className="block px-2 py-2.5 text-slate-400">…</span>
          ) : me ? (
            <>
              <Link
                href="/me"
                className="flex items-center rounded-md px-2 py-2.5 font-medium text-indigo-700 hover:bg-indigo-50"
              >
                <span className="truncate">{me.displayName}</span>
                {me.isVip && <VipBadge />}
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full rounded-md px-2 py-2.5 text-left text-slate-500 hover:bg-slate-100"
              >
                {t("nav.logout")}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="block rounded-md px-2 py-2.5 hover:bg-slate-100">
                {t("nav.login")}
              </Link>
              <Link
                href="/register"
                className="mt-1 block rounded-md bg-indigo-600 px-2 py-2.5 text-center font-medium text-white hover:bg-indigo-700"
              >
                {t("nav.register")}
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}

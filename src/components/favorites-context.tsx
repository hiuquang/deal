"use client";

// Trạng thái tim (❤️) toàn app: tải tập id đã lưu 1 lần khi đăng nhập, cho
// mọi thẻ/nút tim tra cứu + bật/tắt cục bộ (optimistic) — tránh mỗi thẻ tự
// gọi API. Không đăng nhập → tập rỗng, nút tim rơi về nhắc đăng nhập.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { FavoriteKind } from "@/lib/types";
import { useAuth } from "@/components/auth-context";

interface FavoritesState {
  ready: boolean;
  isFavorited: (kind: FavoriteKind, id: string) => boolean;
  /** Bật/tắt lưu; optimistic, tự revert nếu API lỗi. Trả trạng thái mới. */
  toggle: (kind: FavoriteKind, id: string) => Promise<boolean>;
}

const FavoritesContext = createContext<FavoritesState>({
  ready: false,
  isFavorited: () => false,
  toggle: async () => false,
});

function key(kind: FavoriteKind, id: string) {
  return `${kind}:${id}`;
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { me } = useAuth();
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!me) {
      setSaved(new Set());
      setReady(true);
      return;
    }
    let cancelled = false;
    void api
      .favoriteIds()
      .then(({ listingIds, buyOrderIds }) => {
        if (cancelled) return;
        setSaved(
          new Set([
            ...listingIds.map((id) => key("listing", id)),
            ...buyOrderIds.map((id) => key("buy_order", id)),
          ])
        );
      })
      .catch(() => {
        // lỗi tải — coi như chưa lưu gì, thao tác lưu sau vẫn chạy
      })
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, [me]);

  const isFavorited = useCallback(
    (kind: FavoriteKind, id: string) => saved.has(key(kind, id)),
    [saved]
  );

  const toggle = useCallback(
    async (kind: FavoriteKind, id: string): Promise<boolean> => {
      const k = key(kind, id);
      const next = !saved.has(k);
      // Optimistic: đổi UI ngay
      setSaved((prev) => {
        const copy = new Set(prev);
        if (next) copy.add(k);
        else copy.delete(k);
        return copy;
      });
      try {
        await api.toggleFavorite(kind, id, next);
        return next;
      } catch {
        // Revert khi lỗi
        setSaved((prev) => {
          const copy = new Set(prev);
          if (next) copy.delete(k);
          else copy.add(k);
          return copy;
        });
        return !next;
      }
    },
    [saved]
  );

  return (
    <FavoritesContext.Provider value={{ ready, isFavorited, toggle }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesState {
  return useContext(FavoritesContext);
}

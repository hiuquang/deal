"use client";

// i18n nhẹ: locale lưu localStorage, t(key, vars) tra từ điển messages.ts.
// Mặc định tiếng Nhật (thị trường chính); fallback về ja khi thiếu bản dịch.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { MESSAGES, type Locale, type MessageKey } from "@/lib/messages";

export type { Locale, MessageKey };

export const LOCALE_OPTIONS: { value: Locale; label: string; flag: string }[] = [
  { value: "ja", label: "日本語", flag: "🇯🇵" },
  { value: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { value: "en", label: "English", flag: "🇬🇧" },
];

type Vars = Record<string, string | number>;

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Vars) => string;
}

const I18nContext = createContext<I18nState>({
  locale: "ja",
  setLocale: () => {},
  t: (key) => MESSAGES[key]?.ja ?? key,
});

const STORAGE_KEY = "deal_locale";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ja");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "ja" || saved === "vi" || saved === "en") {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    localStorage.setItem(STORAGE_KEY, next);
    setLocaleState(next);
    document.documentElement.lang = next;
  }, []);

  const t = useCallback(
    (key: MessageKey, vars?: Vars) => {
      let text: string = MESSAGES[key]?.[locale] ?? MESSAGES[key]?.ja ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.replaceAll(`{${name}}`, String(value));
        }
      }
      return text;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18nState {
  return useContext(I18nContext);
}

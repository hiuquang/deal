"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api-client";
import type { CardDto, Category, Game } from "@/lib/types";
import { CardAutocomplete } from "@/components/card-autocomplete";
import { GameCategoryPicker } from "@/components/game-category-picker";
import { useAuth } from "@/components/auth-context";
import { ErrorBox, Loading } from "@/components/ui";
import { useI18n, type MessageKey } from "@/lib/i18n";

const input =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none";

export default function NewBuyOrderPage() {
  const { me, loading } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [game, setGame] = useState<Game>("pokemon");
  const [category, setCategory] = useState<Category>("single");
  const [card, setCard] = useState<CardDto | null>(null);
  const [quantity, setQuantity] = useState("10");
  const [maxPrice, setMaxPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <Loading />;
  if (!me) {
    return (
      <div className="py-12 text-center text-sm text-slate-600">
        {t("bon.loginPrompt")}{" "}
        <Link href="/login" className="text-indigo-600 hover:underline">
          {t("nav.login")}
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!card) return setError(t("bon.errNoCard"));
    setBusy(true);
    setError(null);
    try {
      const { buyOrder } = await api.createBuyOrder({
        cardId: card.id,
        quantity: Number(quantity) || 1,
        maxUnitPriceJpy: maxPrice ? Number(maxPrice) : null,
      });
      router.push(`/buy-orders/${buyOrder.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("bon.errSubmit"));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-bold">{t("bon.title")}</h1>
      {error && <ErrorBox message={error} />}
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <GameCategoryPicker
          game={game}
          category={category}
          onGameChange={(g) => { setGame(g); setCard(null); }}
          onCategoryChange={(c) => { setCategory(c); setCard(null); }}
          activeGameClass="bg-amber-600 text-white"
          gameLabel={t("bon.game")}
          categoryLabel={t("bon.category")}
        />

        <div>
          <span className="mb-1 block text-sm font-medium">
            {game === "other"
              ? t("bon.selectOther")
              : category === "box"
                ? t("bon.selectBox")
                : t("bon.selectCard")}
          </span>
          <CardAutocomplete game={game} category={category} onSelect={setCard} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="quantity" className="mb-1 block text-sm font-medium">
              {t("bon.quantity")}
            </label>
            <input
              id="quantity"
              type="number"
              min={1}
              max={999}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label htmlFor="maxPrice" className="mb-1 block text-sm font-medium">
              {t("bon.maxPrice")}
            </label>
            <input
              id="maxPrice"
              type="number"
              min={1}
              max={10000000}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder={t("bon.maxPriceExample")}
              className={input}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {busy ? t("bon.submitting") : t("bon.submit")}
        </button>
      </form>
    </div>
  );
}

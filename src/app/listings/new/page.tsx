"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api-client";
import type { CardDto, Category, Condition, Game, TradeType } from "@/lib/types";
import { BOX_CONDITION_KEYS, SINGLE_CONDITION_KEYS } from "@/lib/labels";
import { CardAutocomplete } from "@/components/card-autocomplete";
import { GameCategoryPicker } from "@/components/game-category-picker";
import { useAuth } from "@/components/auth-context";
import { ErrorBox, Loading } from "@/components/ui";
import { useI18n, type MessageKey } from "@/lib/i18n";

const input =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";

export default function NewListingPage() {
  const { me, loading } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [game, setGame] = useState<Game>("pokemon");
  const [category, setCategory] = useState<Category>("single");
  const [card, setCard] = useState<CardDto | null>(null);
  const [condition, setCondition] = useState<Condition>("RAW_NM");
  const [tradeType, setTradeType] = useState<TradeType>("sell");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [station, setStation] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <Loading />;
  if (!me) {
    return (
      <div className="py-12 text-center text-sm text-slate-600">
        {t("sell.loginPrompt")}{" "}
        <Link href="/login" className="text-indigo-600 hover:underline">
          {t("nav.login")}
        </Link>
      </div>
    );
  }

  function handleFile(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!card) return setError(t("sell.errNoCard"));
    if (!file) return setError(t("sell.errNoPhoto"));
    setBusy(true);
    setError(null);
    try {
      const { url } = await api.uploadImage(file);
      const { listing } = await api.createListing({
        cardId: card.id,
        condition,
        imageUrl: url,
        askingPriceJpy: price ? Number(price) : null,
        quantity: Number(quantity) || 1,
        tradeType,
        station: station || null,
        note: note || null,
      });
      router.push(`/listings/${listing.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("sell.errSubmit"));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-bold">{t("sell.title")}</h1>
      {error && <ErrorBox message={error} />}
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <GameCategoryPicker
          game={game}
          category={category}
          onGameChange={(g) => { setGame(g); setCard(null); }}
          onCategoryChange={(c) => {
            setCategory(c);
            setCard(null);
            setCondition(c === "box" ? "BOX_SHRINK" : "RAW_NM");
          }}
          gameLabel={t("sell.game")}
          categoryLabel={t("sell.category")}
        />

        <div>
          <span className="mb-1 block text-sm font-medium">
            {game === "other"
              ? t("sell.selectOther")
              : category === "box"
                ? t("sell.selectBox")
                : t("sell.selectCard")}
          </span>
          <CardAutocomplete game={game} category={category} onSelect={setCard} />
        </div>

        <div>
          <label htmlFor="condition" className="mb-1 block text-sm font-medium">
            {t("sell.condition")}
          </label>
          <select
            id="condition"
            value={condition}
            onChange={(e) => setCondition(e.target.value as Condition)}
            className={input}
          >
            {(category === "box" ? BOX_CONDITION_KEYS : SINGLE_CONDITION_KEYS).map(
              (value) => (
                <option key={value} value={value}>
                  {t(`cond.${value}` as MessageKey)}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label htmlFor="photo" className="mb-1 block text-sm font-medium">
            {t("sell.photo")}
          </label>
          <input
            id="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700"
          />
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={t("sell.photoPreviewAlt")} className="mt-2 h-40 rounded-lg object-cover" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="mb-1 block text-sm font-medium">{t("sell.tradeType")}</span>
            <select
              value={tradeType}
              onChange={(e) => setTradeType(e.target.value as TradeType)}
              className={input}
              aria-label={t("sell.tradeType")}
            >
              <option value="sell">{t("ttype.sell")}</option>
              <option value="trade">{t("ttype.trade")}</option>
            </select>
          </div>
          <div>
            <label htmlFor="quantity" className="mb-1 block text-sm font-medium">
              {t("sell.quantity")}
            </label>
            <input
              id="quantity"
              type="number"
              min={1}
              max={99}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={input}
            />
          </div>
          <div className="col-span-2">
            <label htmlFor="price" className="mb-1 block text-sm font-medium">
              {t("sell.price")}
            </label>
            <input
              id="price"
              type="number"
              min={1}
              max={10000000}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={t("sell.priceExample")}
              className={input}
            />
          </div>
        </div>

        <div>
          <label htmlFor="station" className="mb-1 block text-sm font-medium">
            📍 {t("sell.station")}
          </label>
          <input
            id="station"
            type="text"
            maxLength={50}
            value={station}
            onChange={(e) => setStation(e.target.value)}
            placeholder={t("sell.stationPlaceholder")}
            className={input}
          />
        </div>

        <div>
          <label htmlFor="note" className="mb-1 block text-sm font-medium">
            {t("sell.note")}
          </label>
          <textarea
            id="note"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("sell.notePlaceholder")}
            className={input}
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? t("sell.submitting") : t("sell.submit")}
        </button>
      </form>
    </div>
  );
}

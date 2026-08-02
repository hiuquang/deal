/**
 * Bộ đọc file quan sát giá (`prisma/reference-prices.txt`) — THUẦN, không đụng
 * DB, để `tests/reference-price-import.test.ts` gọi thẳng được. Phần ghi xuống
 * database nằm ở `prisma/import-reference-prices.ts`.
 *
 * Định dạng: xem đầu file `prisma/reference-prices.txt`.
 */

export const GAMES = ["pokemon", "onepiece", "other"] as const;
export const CATEGORIES = ["single", "box"] as const;
export type Game = (typeof GAMES)[number];
export type Category = (typeof CATEGORIES)[number];

export type Row = {
  line: number;
  game: Game;
  category: Category;
  name: string;
  priceJpy: number;
  quantity: number;
  source: string;
  recordedAt: Date;
};

export class ParseError extends Error {
  constructor(line: number, message: string) {
    super(`Dòng ${line}: ${message}`);
  }
}

/** "12000" · "12,000" · "¥12000" · "12k" · "12.5k" → 12000 / 12500. */
export function parsePrice(raw: string, line = 0): number {
  const text = raw.trim().toLowerCase().replace(/[,\s¥]/g, "");
  const k = /^(\d+(?:\.\d+)?)k$/.exec(text);
  const value = k ? Number(k[1]) * 1000 : Number(text);
  if (!Number.isFinite(value) || value <= 0) {
    throw new ParseError(line, `giá "${raw.trim()}" không đọc được`);
  }
  if (!Number.isInteger(value)) {
    throw new ParseError(line, `giá "${raw.trim()}" ra số lẻ (${value})`);
  }
  return value;
}

/** Ngày hôm nay theo giờ Nhật, "YYYY-MM-DD" (en-CA cho đúng định dạng này). */
export function todayJst(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

/**
 * "" → `now` · "20:00" → hôm nay 20:00 JST · "2026-08-03 20:00" → mốc đó JST.
 *
 * Mọi mốc đều gắn cứng +09:00: dữ liệu quan sát ở Nhật, để máy tự suy múi giờ
 * là lệch 2 tiếng khi chạy từ máy giờ Việt Nam (và lệch nữa nếu đi nước khác).
 */
export function parseWhen(raw: string | undefined, line = 0, now = new Date()): Date {
  const text = (raw ?? "").trim();
  if (!text) return now;

  const timeOnly = /^(\d{1,2}):(\d{2})$/.exec(text);
  const full = /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})$/.exec(text);

  let iso: string;
  if (timeOnly) {
    iso = `${todayJst(now)}T${timeOnly[1].padStart(2, "0")}:${timeOnly[2]}:00+09:00`;
  } else if (full) {
    iso = `${full[1]}T${full[2].padStart(2, "0")}:${full[3]}:00+09:00`;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    // Chỉ có ngày → lấy giữa trưa JST cho khỏi rơi sang ngày khác khi đổi múi giờ.
    iso = `${text}T12:00:00+09:00`;
  } else {
    throw new ParseError(
      line,
      `thời điểm "${text}" không đọc được (dùng "20:00" hoặc "2026-08-03 20:00")`
    );
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new ParseError(line, `thời điểm "${text}" không hợp lệ`);
  return date;
}

/** "rao" (mặc định) / "ban" → nhãn nguồn hiện cho người xem. */
export function parseKindToSource(raw: string | undefined, line = 0): string {
  const text = (raw ?? "rao").trim().toLowerCase();
  if (text === "rao" || text === "") return "Facebook (giá rao)";
  if (text === "ban" || text === "bán") return "Facebook (đã bán)";
  throw new ParseError(line, `"${text}" phải là "rao" hoặc "ban"`);
}

export function parseFile(content: string, now = new Date()): Row[] {
  const rows: Row[] = [];
  let game: Game | null = null;
  let category: Category | null = null;

  content.split(/\r?\n/).forEach((rawLine, i) => {
    const line = i + 1;
    const text = rawLine.trim();
    if (!text) return;

    if (text.startsWith("#")) {
      // Header khai bối cảnh: "# onepiece box". Không khớp đủ cả hai → ghi chú.
      const words = text.slice(1).trim().toLowerCase().split(/\s+/);
      const g = GAMES.find((v) => words.includes(v));
      const c = CATEGORIES.find((v) => words.includes(v));
      if (g && c) {
        game = g;
        category = c;
      }
      return;
    }

    const parts = text.split("|").map((s) => s.trim());
    if (parts.length < 2) {
      throw new ParseError(line, `cần ít nhất "tên | giá", nhận được "${text}"`);
    }
    if (!game || !category) {
      throw new ParseError(line, `chưa khai loại sản phẩm — thêm dòng "# onepiece box" phía trên`);
    }
    const name = parts[0];
    if (!name) throw new ParseError(line, "thiếu tên sản phẩm");

    const quantityRaw = (parts[2] ?? "").trim();
    const quantity = quantityRaw === "" ? 1 : Number(quantityRaw);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new ParseError(line, `số lượng "${quantityRaw}" phải là số nguyên ≥ 1`);
    }

    rows.push({
      line,
      game,
      category,
      name,
      priceJpy: parsePrice(parts[1], line),
      quantity,
      source: parseKindToSource(parts[3], line),
      recordedAt: parseWhen(parts[4], line, now),
    });
  });

  return rows;
}

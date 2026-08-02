/**
 * NHẬP NHANH giá tham khảo từ file text — đường dùng hằng ngày.
 *
 *   npm run db:import-prices              → chỉ XEM THỬ, không ghi gì
 *   npm run db:import-prices -- --apply   → ghi vào DB (production)
 *
 * Khác `seed-reference-prices.ts`: file đó giữ dữ liệu LỊCH SỬ pin cứng trong
 * code (Round One từ v0.21.0, nhãn nguồn cố định). File này là chỗ nhập quan
 * sát mới mỗi ngày mà không phải sửa TypeScript. Cả hai ghi vào cùng bảng
 * `reference_prices`, cùng upsert theo [cardId, source, recordedAt].
 *
 * Định dạng đầu vào + bộ đọc: `prisma/parse-reference-prices.ts`.
 *
 * ⚠️ Dữ liệu ở đây là giá CHỦ WEB TỰ QUAN SÁT ngoài thị trường. KHÔNG đổ vào
 * đây dữ liệu lấy tự động từ sàn khác (SNKRDUNK/スニダン...): điều khoản của họ
 * cấm hiển thị lại thông tin lấy từ dịch vụ và cấm dùng cho mục đích thương
 * mại khi chưa xin phép. Xem CHANGELOG v0.30.0.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { parseFile, type Row } from "./parse-reference-prices";

const prisma = new PrismaClient();

// Quy ước setCode cho sản phẩm chủ web tự thêm (khớp repositories/cards.ts).
function userProductSetCode(game: string, category: string): string {
  const base = game === "other" ? "OTHER" : "CUSTOM";
  return category === "box" ? `${base}-BOX` : base;
}

async function apply(rows: Row[]): Promise<void> {
  for (const row of rows) {
    const setCode = userProductSetCode(row.game, row.category);

    // Find-or-create thẻ (dedupe qua unique [game, setCode, cardNumber, language]).
    const card = await prisma.card.upsert({
      where: {
        game_setCode_cardNumber_language: {
          game: row.game,
          setCode,
          cardNumber: row.name,
          language: "JP",
        },
      },
      update: {},
      create: {
        game: row.game,
        category: row.category,
        setCode,
        cardNumber: row.name,
        language: "JP",
        nameJa: row.name,
        nameEn: row.name,
        rarity: "-",
      },
    });

    await prisma.referencePrice.upsert({
      where: {
        cardId_source_recordedAt: {
          cardId: card.id,
          source: row.source,
          recordedAt: row.recordedAt,
        },
      },
      update: { quantity: row.quantity, priceJpy: row.priceJpy },
      create: {
        cardId: card.id,
        source: row.source,
        quantity: row.quantity,
        priceJpy: row.priceJpy,
        recordedAt: row.recordedAt,
      },
    });
  }
}

async function main() {
  const args = process.argv.slice(2);
  const shouldApply = args.includes("--apply");
  const fileArg = args.find((a) => !a.startsWith("--"));
  const path = resolve(fileArg ?? "prisma/reference-prices.txt");

  const rows = parseFile(readFileSync(path, "utf8"));
  if (rows.length === 0) {
    console.log(`Không có dòng dữ liệu nào trong ${path}.`);
    return;
  }

  console.log(`\n${rows.length} quan sát đọc được từ ${path}:\n`);
  for (const r of rows) {
    const when = r.recordedAt.toLocaleString("vi-VN", { timeZone: "Asia/Tokyo" });
    console.log(
      `  ${String(r.line).padStart(3)} · ${r.game}/${r.category} · ${r.name} · ` +
        `¥${r.priceJpy.toLocaleString("ja-JP")} × ${r.quantity} · ${r.source} · ${when} JST`
    );
  }

  if (!shouldApply) {
    // Mặc định KHÔNG ghi: script chạy thẳng vào DB production, gõ nhầm một
    // dòng mà ghi luôn thì phải vào Supabase dọn tay.
    console.log("\nMới chỉ XEM THỬ. Ưng rồi thì chạy lại kèm --apply để ghi vào DB.");
    return;
  }

  await apply(rows);
  console.log(`\n✓ Đã ghi ${rows.length} quan sát vào reference_prices.`);
}

main()
  .catch((e) => {
    console.error(`\n✗ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

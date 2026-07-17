/**
 * Xóa sạch dữ liệu giao dịch để bàn giao môi trường test:
 * tin đăng, hội thoại/chat, trade, giá, đánh giá, báo cáo, tin gom, comment,
 * session, email token, ảnh upload (Supabase Storage hoặc local).
 *
 * GIỮ LẠI: users (tài khoản demo + tài khoản đã đăng ký) và cards (catalog thẻ
 * — bắt buộc phải có để đăng tin mới).
 *
 * Chạy: npm run db:reset-test
 */
import { PrismaClient } from "@prisma/client";
import { readdir, unlink } from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  // Xóa theo thứ tự con → cha để không vướng khóa ngoại
  const steps: Array<[string, () => Promise<{ count: number }>]> = [
    ["price_records", () => prisma.priceRecord.deleteMany()],
    ["ratings", () => prisma.rating.deleteMany()],
    ["trades", () => prisma.trade.deleteMany()],
    ["messages", () => prisma.message.deleteMany()],
    ["conversations", () => prisma.conversation.deleteMany()],
    ["purchase_requests", () => prisma.purchaseRequest.deleteMany()],
    ["comments", () => prisma.comment.deleteMany()],
    ["buy_order_offers", () => prisma.buyOrderOffer.deleteMany()],
    ["buy_orders", () => prisma.buyOrder.deleteMany()],
    ["listings", () => prisma.listing.deleteMany()],
    ["reports", () => prisma.report.deleteMany()],
    ["sessions", () => prisma.session.deleteMany()],
    ["email_tokens", () => prisma.emailToken.deleteMany()],
    ["email_outbox", () => prisma.emailOutbox.deleteMany()],
  ];
  for (const [name, run] of steps) {
    const { count } = await run();
    console.log(`  ${name}: xóa ${count}`);
  }

  const users = await prisma.user.count();
  const cards = await prisma.card.count();
  console.log(`Giữ lại: ${users} users, ${cards} cards.`);

  // Ảnh upload: có Supabase Storage thì xóa object trong bucket, không thì dọn
  // thư mục local. Cả hai đều giữ file của repo (seed-card.svg, .gitkeep).
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey) {
    const res = await fetch(`${supabaseUrl}/storage/v1/object/list/uploads`, {
      method: "POST",
      headers: { authorization: `Bearer ${serviceKey}`, "content-type": "application/json" },
      body: JSON.stringify({ prefix: "", limit: 1000 }),
    });
    const files = (await res.json()) as Array<{ name: string }>;
    for (const f of files) {
      await fetch(`${supabaseUrl}/storage/v1/object/uploads/${f.name}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${serviceKey}` },
      });
    }
    console.log(`Ảnh trên Supabase Storage: xóa ${files.length} file.`);
    return;
  }

  const KEEP = new Set(["seed-card.svg", ".gitkeep"]);
  const dir = path.join(process.cwd(), "public", "uploads");
  let removed = 0;
  for (const f of await readdir(dir)) {
    if (KEEP.has(f)) continue;
    await unlink(path.join(dir, f));
    removed++;
  }
  console.log(`Ảnh upload local: xóa ${removed} file.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

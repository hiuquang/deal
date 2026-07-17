import { listListingsSchema } from "@/server/validation";
import * as listingService from "@/server/services/listing-service";
import { HomeBoard, type InitialBoard } from "./home-board";

// Trang chủ server-render lượt tải đầu (đọc searchParams → luôn dynamic):
// mở trang là thấy tin ngay thay vì spinner chờ client fetch. Lọc/tìm sau đó
// vẫn chạy phía client qua api-client như cũ (HomeBoard chỉ skip fetch đầu).
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const parsed = listListingsSchema.safeParse({
    q: first(sp.q),
    game: first(sp.game),
    category: first(sp.category),
  });
  // Param rác trên URL → render không lọc, client tự xử lý phần còn lại.
  const input = parsed.success ? parsed.data : listListingsSchema.parse({});

  let initial: InitialBoard | null = null;
  try {
    // Cùng mặc định với GET /api/listings: chợ chỉ hiện tin đang mở.
    const { listings, total } = await listingService.list({ ...input, status: "active" });
    initial = {
      listings,
      total,
      key: `${input.q ?? ""}|${input.game ?? ""}|${input.category ?? ""}`,
    };
  } catch {
    // DB chưa sẵn sàng (pooler nguội…) → client fetch như trước, trang không chết.
  }
  return <HomeBoard initial={initial} />;
}

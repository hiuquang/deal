import { listListingsSchema } from "@/server/validation";
import * as listingService from "@/server/services/listing-service";
import * as buyOrderService from "@/server/services/buy-order-service";
import { boardKey, parseBoardType } from "@/lib/board";
import { trangThaiHienTrenCho } from "@/server/showcase";
import { HomeBoard, type InitialBoard } from "./home-board";

// Trang chủ server-render lượt tải đầu (đọc searchParams → luôn dynamic):
// mở trang là thấy tin ngay thay vì spinner chờ client fetch. Lọc/tìm sau đó
// vẫn chạy phía client qua api-client như cũ (HomeBoard chỉ skip fetch đầu).
//
// Từ v0.23.0 bảng tin gộp cả tin bán lẫn tin ĐĂNG MUA → SSR phải lấy đúng cùng
// tập với client, nếu không lượt tải đầu thiếu tin đăng mua rồi nhảy khi client
// fetch xong (và `key` sẽ không khớp nên refetch thừa ngay lập tức).
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
  const boardType = parseBoardType(first(sp.type));

  let initial: InitialBoard | null = null;
  try {
    // Cùng mặc định với GET /api/listings + /api/buy-orders: chợ chỉ hiện tin đang mở.
    const [listingRes, buyOrderRes] = await Promise.all([
      boardType === "buy"
        ? Promise.resolve({ listings: [], total: 0 })
        : listingService.list({ ...input, statuses: trangThaiHienTrenCho() }),
      boardType === "sell"
        ? Promise.resolve({ buyOrders: [], total: 0 })
        : buyOrderService.list({ ...input, status: "active" }),
    ]);
    initial = {
      listings: listingRes.listings,
      buyOrders: buyOrderRes.buyOrders,
      total: listingRes.total + buyOrderRes.total,
      key: boardKey(input.q ?? "", input.game ?? "", input.category ?? "", boardType),
    };
  } catch (error) {
    // DB chưa sẵn sàng (pooler nguội…) → client fetch như trước, trang không chết.
    // CÓ log: nuốt im lặng làm hỏng SSR mà nhìn bên ngoài y hệt lúc chạy tốt
    // (trang vẫn có tin, chỉ là do client fetch) — rất khó phát hiện.
    console.error("[home] SSR bảng tin thất bại, rơi về client fetch:", error);
  }
  return <HomeBoard initial={initial} />;
}

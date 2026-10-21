import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ApiError, withErrorHandling } from "@/server/errors";
import * as kaitoriPostsService from "@/server/services/kaitori-posts-service";
import { KAITORI_REGIONS } from "@/lib/kaitori-shops";

// Grok + X Search + vài chục lượt hỏi oEmbed: vượt xa trần 10s mặc định cũ.
// 60s là mức mọi gói Vercel đều cho.
export const maxDuration = 60;

/**
 * Chỉ GitHub Actions gọi (.github/workflows/kaitori-posts.yml), mang
 * `Authorization: Bearer <CRON_SECRET>`. Mỗi lượt tốn tiền xAI thật nên:
 *  - Thiếu `CRON_SECRET` → chặn hết, không phải mở hết.
 *  - Sai khóa cũng trả 404 (như /admin): người dò không biết ở đây CÓ gì.
 *  - Chỉ POST: để ở GET là dán link vào đâu cũng kích hoạt được.
 */
function assertCronSecret(req: NextRequest): void {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  // So qua hash để hai bên luôn cùng độ dài → timingSafeEqual không ném lỗi,
  // và độ dài khóa không lộ qua thời gian phản hồi.
  const digest = (s: string) => createHash("sha256").update(s).digest();
  if (!secret || !given || !timingSafeEqual(digest(secret), digest(given))) {
    throw new ApiError(404, "NOT_FOUND", "Không tìm thấy.");
  }
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  assertCronSecret(req);
  const result = await kaitoriPostsService.refresh();
  // Trang vùng là ISR — làm mới ngay thay vì chờ hết hạn cache.
  for (const region of KAITORI_REGIONS) revalidatePath(`/kaitori/${region}`);
  return NextResponse.json(result);
});

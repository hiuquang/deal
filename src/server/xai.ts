/**
 * Gọi Grok (xAI) với công cụ X Search để nhặt giá 買取 các shop đăng trên X.
 *
 * Vì sao hợp lệ, khác hẳn vụ SNKRDUNK đã từ chối ở v0.30.0: đây là **API xAI
 * bán ra**, dùng đúng mục đích, không cào lén; còn giá 買取 thì shop CỐ Ý đăng
 * công khai để mời khách mang thẻ tới bán. Ta ghi lại dữ kiện đó, không sao
 * chép nội dung hay ảnh của ai.
 *
 * ⚠️ MÔ HÌNH NGÔN NGỮ ĐỌC TWEET SẼ SAI — nhầm thẻ, nuốt mất chữ "tối đa",
 * tưởng bài đăng lại là bài mới. Đầu ra của hàm này là **ĐỀ XUẤT CHỜ DUYỆT**,
 * tuyệt đối không ghi thẳng vào `reference_prices`. Chủ web duyệt từng dòng ở
 * `/admin/kaitori` rồi mới lưu. Dataset giá là lý do cả dự án tồn tại; đổ
 * thẳng output LLM vào đó là đầu độc đúng thứ mình đang xây.
 *
 * Giá API (xAI, 2026-10): X Search ~$5/1.000 bài lấy về + token model. Mỗi lần
 * quét vài chục bài nên tính bằng cent.
 */
import { z } from "zod";
import { ApiError } from "@/server/errors";

const ENDPOINT = "https://api.x.ai/v1/responses";
const MODEL = "grok-4.7";

/** Số bài tối đa Grok được phép đọc một lượt — chặn hoá đơn chạy mất kiểm soát. */
const MAX_TURNS = 2;

export function isXaiConfigured(): boolean {
  return Boolean(process.env.XAI_API_KEY);
}

/** Một dòng giá 買取 Grok đề xuất — CHƯA được kiểm chứng. */
export const kaitoriCandidateSchema = z.object({
  /** Tên sản phẩm đúng như trong bài, thường tiếng Nhật */
  productName: z.string().trim().min(1).max(200),
  /** Giá shop thu vào, yên, số nguyên */
  priceJpy: z.number().int().positive().max(100_000_000),
  /** Tên shop (handle X, không @) */
  shop: z.string().trim().min(1).max(100),
  /** Ngày bài đăng, YYYY-MM-DD */
  postedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Link bài gốc để chủ web bấm vào kiểm lại */
  sourceUrl: z.string().url().max(500).optional().nullable(),
});
export type KaitoriCandidate = z.infer<typeof kaitoriCandidateSchema>;

const responseSchema = z.object({ items: z.array(kaitoriCandidateSchema).max(60) });

function buildPrompt(handles: string[], fromDate: string, toDate: string): string {
  return [
    `Tìm các bài đăng về giá 買取 (giá shop THU VÀO từ khách) của thẻ bài TCG`,
    `(Pokémon, One Piece) từ các tài khoản: ${handles.join(", ")}.`,
    `Khoảng thời gian: ${fromDate} đến ${toDate}.`,
    "",
    "Chỉ lấy giá 買取 (shop mua vào). TUYỆT ĐỐI KHÔNG lấy 販売価格 (giá shop bán ra).",
    "Bỏ qua bài không ghi rõ con số, bài chỉ nói 'tối đa'/'最大'/'〜まで' mà không có giá cụ thể cho một sản phẩm,",
    "và bài đăng lại của bảng giá cũ.",
    "",
    "Trả lời DUY NHẤT bằng JSON hợp lệ, không kèm giải thích, không bọc trong ```:",
    '{"items":[{"productName":"…","priceJpy":12000,"shop":"handle_khong_co_@","postedOn":"YYYY-MM-DD","sourceUrl":"https://x.com/…"}]}',
    "",
    "Nếu không tìm được gì thì trả về {\"items\":[]}.",
  ].join("\n");
}

/** Gom mọi đoạn text trong `output` của Responses API (hình dạng có thể đổi). */
function collectText(payload: unknown): string {
  const parts: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === "string") return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === "object") {
      const obj = node as Record<string, unknown>;
      if (obj.type === "output_text" && typeof obj.text === "string") parts.push(obj.text);
      Object.values(obj).forEach(walk);
    }
  };
  walk(payload);
  return parts.join("\n");
}

/**
 * Cắt lấy khối JSON đầu tiên trong câu trả lời. Dù prompt đã dặn "chỉ JSON",
 * mô hình vẫn hay bọc ```json hoặc thêm một câu dẫn — bắt đúng cặp ngoặc là
 * cách duy nhất chịu được cả hai.
 */
function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new ApiError(502, "XAI_BAD_OUTPUT", "Grok trả về dữ liệu không đọc được.");
  }
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new ApiError(502, "XAI_BAD_OUTPUT", "Grok trả về JSON hỏng.");
  }
}

export async function searchKaitori(input: {
  handles: string[];
  fromDate: string;
  toDate: string;
}): Promise<{ items: KaitoriCandidate[]; postsFetched: number }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new ApiError(
      503,
      "XAI_NOT_CONFIGURED",
      "Chưa cấu hình XAI_API_KEY nên không quét được. Xem docs/kaitori.md."
    );
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: [{ role: "user", content: buildPrompt(input.handles, input.fromDate, input.toDate) }],
      // `to_date` là mốc LOẠI TRỪ theo tài liệu xAI — bên gọi đã cộng thêm 1 ngày.
      tools: [
        {
          type: "x_search",
          allowed_x_handles: input.handles,
          from_date: input.fromDate,
          to_date: input.toDate,
        },
      ],
      max_turns: MAX_TURNS,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[xai] ${res.status} ${body.slice(0, 500)}`);
    // Không ném nguyên body ra client: có thể lẫn chi tiết tài khoản/khoá.
    throw new ApiError(502, "XAI_FAILED", `Gọi Grok thất bại (HTTP ${res.status}).`);
  }

  const payload: unknown = await res.json();
  const parsed = responseSchema.safeParse(extractJson(collectText(payload)));
  if (!parsed.success) {
    console.error(`[xai] output sai schema: ${parsed.error.message.slice(0, 300)}`);
    throw new ApiError(502, "XAI_BAD_OUTPUT", "Grok trả về dữ liệu sai định dạng.");
  }

  const usage = (payload as { usage?: { server_side_tool_usage_details?: Record<string, number> } })
    .usage?.server_side_tool_usage_details;
  const postsFetched = usage?.x_posts_fetched ?? 0;
  console.log(`[xai] quét ${input.handles.length} handle → ${parsed.data.items.length} đề xuất, ${postsFetched} bài đã đọc`);

  return { items: parsed.data.items, postsFetched };
}

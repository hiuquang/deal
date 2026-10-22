/**
 * Tạo ảnh minh hoạ cho tin ở trang /kaitori bằng Gemini hoặc OpenAI.
 *
 *   npm run news:images                # chỉ tạo ảnh còn thiếu
 *   npm run news:images -- --force     # tạo lại tất cả
 *   npm run news:images -- --provider openai
 *
 * Đọc GEMINI_API_KEY / OPENAI_API_KEY từ .env (không in khóa ra đâu cả). Ảnh
 * thu về webp 256×256 trong public/news/<id>.webp — hiển thị 96px, 256 đủ nét
 * cho màn hình mật độ cao mà mỗi file chỉ vài chục KB thay vì 1–2MB.
 *
 * Script KHÔNG tự điền `imageFile` vào kaitori-news.ts: người phải MỞ XEM
 * từng ảnh trước (mô hình vẫn có thể lén vẽ chữ hay một nhân vật quen), rồi
 * mới điền tay. Đó là lý do tách hai trường imagePrompt / imageFile.
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import sharp from "sharp";
import { IMAGE_STYLE, POKEMON_NEWS } from "../src/lib/kaitori-news";

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "news");
const SIZE = 256;

// Model đã đối chiếu tài liệu chính thức ngày 2026-10-21.
const GEMINI_MODEL = "gemini-nano-banana-2.1";
const OPENAI_MODEL = "gpt-image-2.5-flare";

/** Đọc đúng một biến trong .env mà không nạp cả file vào process.env. */
function envKey(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const file = path.join(ROOT, ".env");
  if (!existsSync(file)) return undefined;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = new RegExp(`^\\s*${name}\\s*=\\s*(.*)\\s*$`).exec(line);
    if (m) return m[1].replace(/^["']|["']$/g, "") || undefined;
  }
  return undefined;
}

/** Ảnh base64 cuối cùng trong response Gemini (hình dạng response có thể đổi → đi cả cây). */
function lastImageData(node: unknown): string | undefined {
  let found: string | undefined;
  const walk = (n: unknown): void => {
    if (Array.isArray(n)) return n.forEach(walk);
    if (n && typeof n === "object") {
      const o = n as Record<string, unknown>;
      if (o.type === "image" && typeof o.data === "string") found = o.data;
      Object.values(o).forEach(walk);
    }
  };
  walk(node);
  return found;
}

async function generateGemini(key: string, prompt: string): Promise<Buffer> {
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      input: [{ type: "text", text: prompt }],
      response_format: { type: "image", aspect_ratio: "1:1", image_size: "1K", mime_type: "image/png" },
    }),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = lastImageData(await res.json());
  if (!data) throw new Error("Gemini không trả ảnh (có thể bị bộ lọc nội dung chặn).");
  return Buffer.from(data, "base64");
}

async function generateOpenAI(key: string, prompt: string): Promise<Buffer> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      prompt,
      size: "1024x1024",
      quality: "medium",
      output_format: "png",
    }),
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = body.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI không trả ảnh.");
  return Buffer.from(b64, "base64");
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const wanted = args[args.indexOf("--provider") + 1];

  const gemini = envKey("GEMINI_API_KEY");
  const openai = envKey("OPENAI_API_KEY");
  const provider =
    wanted === "openai" || wanted === "gemini" ? wanted : gemini ? "gemini" : openai ? "openai" : null;
  const key = provider === "gemini" ? gemini : provider === "openai" ? openai : undefined;
  if (!provider || !key) {
    console.error("Thiếu khóa: đặt GEMINI_API_KEY hoặc OPENAI_API_KEY trong .env (xem docs/kaitori.md).");
    process.exit(1);
  }
  console.log(`Dùng ${provider} (${provider === "gemini" ? GEMINI_MODEL : OPENAI_MODEL})`);

  mkdirSync(OUT_DIR, { recursive: true });
  let made = 0;
  for (const news of POKEMON_NEWS) {
    if (!news.imagePrompt) continue;
    const out = path.join(OUT_DIR, `${news.id}.webp`);
    if (existsSync(out) && !force) {
      console.log(`  bỏ qua (đã có): ${news.id}`);
      continue;
    }
    const prompt = `${IMAGE_STYLE}\n\nSubject: ${news.imagePrompt}`;
    try {
      const raw = provider === "gemini" ? await generateGemini(key, prompt) : await generateOpenAI(key, prompt);
      const webp = await sharp(raw).resize(SIZE, SIZE, { fit: "cover" }).webp({ quality: 82 }).toBuffer();
      writeFileSync(out, webp);
      console.log(`  ✓ ${news.id} → public/news/${news.id}.webp (${Math.round(webp.length / 1024)} KB)`);
      made++;
    } catch (e) {
      console.error(`  ✗ ${news.id}: ${(e as Error).message}`);
    }
  }
  console.log(`\nĐã tạo ${made} ảnh. MỞ XEM từng ảnh, rồi mới điền imageFile trong src/lib/kaitori-news.ts.`);
}

main();

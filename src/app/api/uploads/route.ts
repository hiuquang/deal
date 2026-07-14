import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { ApiError, withErrorHandling } from "@/server/errors";
import { requireVerifiedUser } from "@/server/session";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

// MVP: lưu local vào public/uploads. V2 khi deploy → cloud storage (S3/R2).
export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireVerifiedUser();

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new ApiError(400, "VALIDATION", "画像ファイルを選択してください。");
  }
  const ext = ALLOWED[file.type];
  if (!ext) {
    throw new ApiError(400, "VALIDATION", "JPEG / PNG / WebP のみアップロードできます。");
  }
  if (file.size > MAX_SIZE) {
    throw new ApiError(400, "VALIDATION", "画像サイズは5MB以下にしてください。");
  }

  const name = `${randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ url: `/uploads/${name}` }, { status: 201 });
});

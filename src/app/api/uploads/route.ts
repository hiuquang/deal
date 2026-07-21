import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { ApiError, withErrorHandling } from "@/server/errors";
import { requireVerifiedUser } from "@/server/session";
import * as rateLimit from "@/server/services/rate-limit-service";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

// Có SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY → Supabase Storage (bucket
// public "uploads", REST API — không cần SDK). Không có → lưu local
// public/uploads (dev). Vercel không có đĩa ghi được nên production BẮT BUỘC
// cấu hình Supabase.
async function store(name: string, buf: Buffer, contentType: string): Promise<string> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey) {
    const res = await fetch(`${supabaseUrl}/storage/v1/object/uploads/${name}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${serviceKey}`,
        "content-type": contentType,
        "cache-control": "public, max-age=31536000, immutable",
      },
      body: new Uint8Array(buf),
    });
    if (!res.ok) {
      console.error("Supabase Storage upload failed:", res.status, await res.text());
      throw new ApiError(500, "INTERNAL", "Tải ảnh lên thất bại.");
    }
    return `${supabaseUrl}/storage/v1/object/public/uploads/${name}`;
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buf);
  return `/uploads/${name}`;
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await requireVerifiedUser();
  await rateLimit.enforce("upload:user", user.id);

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new ApiError(400, "VALIDATION", "Vui lòng chọn file ảnh.");
  }
  const ext = ALLOWED[file.type];
  if (!ext) {
    throw new ApiError(400, "VALIDATION", "Chỉ tải lên được JPEG / PNG / WebP.");
  }
  if (file.size > MAX_SIZE) {
    throw new ApiError(400, "VALIDATION", "Kích thước ảnh tối đa 5MB.");
  }

  const name = `${randomUUID()}${ext}`;
  const url = await store(name, Buffer.from(await file.arrayBuffer()), file.type);

  return NextResponse.json({ url }, { status: 201 });
});

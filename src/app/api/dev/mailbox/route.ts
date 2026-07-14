import { NextResponse } from "next/server";
import { ApiError, withErrorHandling } from "@/server/errors";
import { isSmtpConfigured } from "@/server/mailer";
import { listOutbox } from "@/server/repositories/email-tokens";

// Hộp thư DEV — chỉ tồn tại khi chưa cấu hình SMTP và không phải production.
export const GET = withErrorHandling(async () => {
  if (process.env.NODE_ENV === "production" || isSmtpConfigured()) {
    throw new ApiError(404, "NOT_FOUND", "Not found");
  }
  const rows = await listOutbox();
  return NextResponse.json({
    emails: rows.map((row) => ({
      id: row.id,
      to: row.toEmail,
      subject: row.subject,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
    })),
  });
});

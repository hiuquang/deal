import nodemailer from "nodemailer";
import { prisma } from "@/server/db";

/**
 * Gửi email theo chuỗi dự phòng (đọc env tại thời điểm gọi để test được):
 * 1. Có SMTP_HOST/USER/PASS → Gmail SMTP trước. Gmail giới hạn ~500 người
 *    nhận/ngày, vượt là bị chặn gửi 24-72h — nhưng là đường DUY NHẤT chắc chắn
 *    tới hộp thư khi sender còn là địa chỉ @gmail.com (mail tự xác thực).
 * 2. SMTP lỗi hoặc chưa cấu hình → Brevo HTTP API (free 300 mail/ngày).
 *    Sender là BREVO_FROM — PHẢI verify trước trên dashboard Brevo.
 *    ⚠️ Brevo KHÔNG được làm đường chính chừng nào BREVO_FROM còn là freemail
 *    (@gmail.com...): Brevo nhận mail (2xx) nhưng Gmail từ chối thẳng ở cửa
 *    SMTP vì mail mạo danh gmail.com không có DKIM — không vào nổi cả thư mục
 *    spam, thành hố đen im lặng. Chỉ đảo lại thứ tự sau khi có domain riêng
 *    đã authenticate (SPF/DKIM) trên Brevo.
 * 3. Cả hai chưa cấu hình → DEV MODE: lưu bảng email_outbox, xem /dev/mailbox.
 */

function brevoConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_FROM);
}

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/** Có ít nhất 1 đường gửi mail thật → /dev/mailbox tự vô hiệu. */
export function isMailConfigured(): boolean {
  return brevoConfigured() || smtpConfigured();
}

export function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

async function sendViaBrevo(to: string, subject: string, body: string): Promise<void> {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY as string,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: "DEAL", email: process.env.BREVO_FROM },
      to: [{ email: to }],
      subject,
      textContent: body,
    }),
    // Serverless không được treo vô hạn chờ Brevo — quá 10s coi như lỗi để còn fallback.
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`Brevo ${res.status}: ${await res.text()}`);
  }
}

async function sendViaSmtp(to: string, subject: string, body: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: Number(process.env.SMTP_PORT ?? 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? `DEAL <${process.env.SMTP_USER}>`,
    to,
    subject,
    text: body,
  });
}

export async function sendMail(to: string, subject: string, body: string): Promise<void> {
  if (smtpConfigured()) {
    try {
      await sendViaSmtp(to, subject, body);
      console.log(`[mail][smtp] sent to ${to}: ${subject}`);
      return;
    } catch (e) {
      // Không có đường lui → ném tiếp cho caller; có Brevo → ghi log rồi fallback.
      if (!brevoConfigured()) throw e;
      console.error(`[mail][smtp] failed, falling back to Brevo:`, e);
    }
  }
  if (brevoConfigured()) {
    await sendViaBrevo(to, subject, body);
    console.log(`[mail][brevo] sent to ${to}: ${subject}`);
    return;
  }
  await prisma.emailOutbox.create({ data: { toEmail: to, subject, body } });
  console.log(`[mail][DEV] outbox ← ${to}: ${subject}\n${body}`);
}

import nodemailer from "nodemailer";
import { prisma } from "@/server/db";

/**
 * Gửi email:
 * - Có đủ SMTP_HOST/SMTP_USER/SMTP_PASS trong env → gửi thật qua nodemailer
 *   (Gmail: SMTP_HOST=smtp.gmail.com, SMTP_PORT=465, SMTP_USER=địa chỉ Gmail,
 *   SMTP_PASS=App Password — xem README).
 * - Thiếu → DEV MODE: lưu vào bảng email_outbox, xem tại /dev/mailbox.
 */
const smtpConfigured = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
);

export function isSmtpConfigured(): boolean {
  return smtpConfigured;
}

export function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

export async function sendMail(to: string, subject: string, body: string): Promise<void> {
  if (smtpConfigured) {
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
    console.log(`[mail] sent to ${to}: ${subject}`);
    return;
  }
  await prisma.emailOutbox.create({ data: { toEmail: to, subject, body } });
  console.log(`[mail][DEV] outbox ← ${to}: ${subject}\n${body}`);
}

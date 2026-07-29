import { prisma } from "@/server/db";

/** Đăng ký nhận thông báo đẩy theo thiết bị (Web Push). */

export type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

/**
 * Lưu đăng ký của một thiết bị. Key là `endpoint` (trình duyệt cấp): bật lại
 * trên cùng máy → upsert đè, không sinh bản ghi rác. Đổi tài khoản trên cùng
 * trình duyệt → `userId` được ghi đè để thông báo đi đúng người.
 */
export function upsert(
  userId: string,
  endpoint: string,
  p256dh: string,
  auth: string,
  userAgent: string | null
) {
  return prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId, p256dh, auth, userAgent },
    create: { userId, endpoint, p256dh, auth, userAgent },
  });
}

/** Tắt thông báo trên thiết bị hiện tại. deleteMany → không lỗi nếu đã xóa. */
export function removeByEndpoint(userId: string, endpoint: string) {
  return prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

/**
 * Xóa theo endpoint bất kể chủ sở hữu — dùng khi nhà cung cấp push trả 404/410
 * (endpoint chết hẳn), lúc đó bản ghi vô giá trị với mọi user.
 */
export function removeDead(endpoint: string) {
  return prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

export function listForUser(userId: string): Promise<PushSubscriptionRow[]> {
  return prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
}

/** Thiết bị hiện tại đã bật chưa (để UI hiện đúng trạng thái nút). */
export async function existsForUser(userId: string, endpoint: string): Promise<boolean> {
  const row = await prisma.pushSubscription.findFirst({
    where: { userId, endpoint },
    select: { id: true },
  });
  return row !== null;
}

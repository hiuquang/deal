import { prisma } from "@/server/db";

export function createReport(data: {
  reporterId: string;
  reportedUserId: string;
  listingId: string | null;
  reason: string;
}) {
  return prisma.report.create({ data });
}

/**
 * Thống kê report cho khối Trust & Safety trên hồ sơ công khai.
 * `pendingReporters` đếm NGƯỜI KHÁC NHAU (distinct reporter) chứ không đếm
 * report — 1 người spam 10 report vẫn chỉ tính là 1 (chống report bẩn).
 */
export async function getReportStatsForUser(userId: string): Promise<{
  verifiedCount: number;
  pendingReporters: number;
  lastVerifiedAt: Date | null;
}> {
  const [verifiedCount, lastVerified, pending] = await Promise.all([
    prisma.report.count({ where: { reportedUserId: userId, status: "verified" } }),
    prisma.report.findFirst({
      where: { reportedUserId: userId, status: "verified" },
      orderBy: { createdAt: "desc" },
      select: { resolvedAt: true, createdAt: true },
    }),
    prisma.report.findMany({
      where: { reportedUserId: userId, status: "pending" },
      select: { reporterId: true },
      distinct: ["reporterId"],
    }),
  ]);
  return {
    verifiedCount,
    pendingReporters: pending.length,
    lastVerifiedAt: lastVerified ? lastVerified.resolvedAt ?? lastVerified.createdAt : null,
  };
}

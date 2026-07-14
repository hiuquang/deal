import { prisma } from "@/server/db";

export function createReport(data: {
  reporterId: string;
  reportedUserId: string;
  listingId: string | null;
  reason: string;
}) {
  return prisma.report.create({ data });
}

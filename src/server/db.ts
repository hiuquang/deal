import { PrismaClient } from "@prisma/client";

// Giữ 1 instance PrismaClient duy nhất qua các lần hot-reload của Next dev.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

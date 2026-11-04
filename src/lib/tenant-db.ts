
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const withTenant = async <T>(
  userId: string,
  tenantId: string,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> => {
  return prisma.$withTenant(userId, tenantId, callback);
};
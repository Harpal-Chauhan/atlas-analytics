
import { PrismaClient, type Prisma } from "@/generated/prisma/client";

const createPrismaClient = () => {
    const appDatabaseUrl = process.env.APP_DATABASE_URL;

    if (!appDatabaseUrl) {
        throw new Error("APP_DATABASE_URL is not configured.");
    }

    const baseClient = new PrismaClient({
        datasources: {
            db: {
                url: appDatabaseUrl,
            },
        },
    });

    return baseClient.$extends({
        client: {
            $withTenant: async <T>(
                userId: string,
                tenantId: string,
                callback: (tx: Prisma.TransactionClient) => Promise<T>,
            ): Promise<T> => {
                return baseClient.$transaction(async (tx) => {
                    await tx.$queryRaw`
            SELECT set_config('app.user_id', ${userId}, true)
          `;

                    await tx.$queryRaw`
            SELECT set_config('app.tenant_id', ${tenantId}, true)
          `;

                    const membership = await tx.membership.findUnique({
                        where: {
                            userId_tenantId: {
                                userId,
                                tenantId,
                            },
                        },
                        select: {
                            role: true,
                        },
                    });

                    if (!membership) {
                        throw new Error(
                            "You do not have access to this organization.",
                        );
                    }

                    const tenant = await tx.tenant.findUnique({
                        where: {
                            id: tenantId,
                        },
                        select: {
                            suspendedAt: true,
                        },
                    });

                    if (!tenant || tenant.suspendedAt) {
                        throw new Error("Organization is unavailable.");
                    }

                    return callback(tx);
                });
            },
        },
    });
};

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
    prisma: ExtendedPrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

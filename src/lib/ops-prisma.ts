
import { PrismaClient } from "@/generated/prisma/client";

const createOpsPrismaClient = () => {
    const opsDatabaseUrl = process.env.OPS_DATABASE_URL;

    if (!opsDatabaseUrl) {
        throw new Error("OPS_DATABASE_URL is not configured.");
    }

    return new PrismaClient({
        datasources: {
            db: {
                url: opsDatabaseUrl,
            },
        },
    });
};

type OpsPrismaClient = ReturnType<typeof createOpsPrismaClient>;

const globalForOpsPrisma = globalThis as unknown as {
    opsPrisma: OpsPrismaClient | undefined;
};

export const opsPrisma =
    globalForOpsPrisma.opsPrisma ?? createOpsPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForOpsPrisma.opsPrisma = opsPrisma;
}

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

export const createTestPrismaClient = (connectionString: string) => {
    const pool = new Pool({
        connectionString,
    });

    const adapter = new PrismaPg(pool);

    return new PrismaClient({
        adapter,
    });
};

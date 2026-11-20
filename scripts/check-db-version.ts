import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient();

async function main() {
  const result = await db.$queryRaw`SELECT version()`;
  console.log("PostgreSQL Server Version:");
  console.log(result);
}

main()
  .catch(console.error)
  .finally(async () => {
    await db.$disconnect();
  });

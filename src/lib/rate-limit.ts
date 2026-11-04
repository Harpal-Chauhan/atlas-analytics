
import type { Prisma } from "@/generated/prisma/client";

const CAPACITY = 100;
const REFILL_PER_SECOND = 100 / 60;

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export const consumeApiKeyToken = async (
  tx: Prisma.TransactionClient,
  apiKeyId: string,
): Promise<RateLimitResult> => {
  await tx.apiKeyRateLimit.upsert({
    where: { apiKeyId },
    create: {
      apiKeyId,
      tokens: CAPACITY,
      lastRefillAt: new Date(),
    },
    update: {},
  });

  const rows = await tx.$queryRaw<
    Array<{
      allowed: boolean;
      retryAfterSeconds: number;
    }>
  >`
    WITH bucket AS (
      SELECT
        "apiKeyId",
        LEAST(
          ${CAPACITY}::double precision,
          "tokens" +
          GREATEST(
            0,
            EXTRACT(
              EPOCH FROM (clock_timestamp() - "lastRefillAt")
            )
          ) * ${REFILL_PER_SECOND}
        ) AS "availableTokens"
      FROM "ApiKeyRateLimit"
      WHERE "apiKeyId" = ${apiKeyId}
      FOR UPDATE
    ),
    updated AS (
      UPDATE "ApiKeyRateLimit" AS rate_limit
      SET
        "tokens" = CASE
          WHEN bucket."availableTokens" >= 1
          THEN bucket."availableTokens" - 1
          ELSE bucket."availableTokens"
        END,
        "lastRefillAt" = clock_timestamp(),
        "updatedAt" = clock_timestamp()
      FROM bucket
      WHERE rate_limit."apiKeyId" = bucket."apiKeyId"
      RETURNING bucket."availableTokens"
    )
    SELECT
      "availableTokens" >= 1 AS allowed,
      CASE
        WHEN "availableTokens" < 1
        THEN GREATEST(
          1,
          CEIL(
            (1 - "availableTokens") / ${REFILL_PER_SECOND}
          )
        )::integer
        ELSE 0
      END AS "retryAfterSeconds"
    FROM updated
  `;

  const result = rows[0];

  if (!result) {
    throw new Error("Rate-limit bucket could not be loaded.");
  }

  return result;
};

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  createApiKey,
  createApiKeyLookupHash,
  hashApiKey,
} from "@/lib/api-key";
import { createRequestLogger } from "@/lib/request-logger";

const apiKeySchema = z.object({
  name: z.string().trim().min(2).max(100),
});

export const GET = async (request: Request) => {
  const { requestId, log } = createRequestLogger(request);

  const respond = (
    body: unknown,
    status = 200,
  ) =>
    NextResponse.json(body, {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Request-Id": requestId,
      },
    });

  log("info", "api_keys_list_requested");

  try {
    const session = await auth();
    const userId = session?.user?.id;
    const tenantId = session?.user?.activeTenantId;

    if (!userId) {
      log("warn", "api_keys_list_unauthorized");
      return respond(
        { message: "Please log in first." },
        401,
      );
    }

    if (!tenantId) {
      log("warn", "api_keys_list_missing_active_tenant", {
        userId,
      });

      return respond(
        { message: "Please select an active organization." },
        409,
      );
    }

    const result = await prisma.$withTenant(
      userId,
      tenantId,
      async (tx) => {
        const membership = await tx.membership.findUnique({
          where: {
            userId_tenantId: {
              userId,
              tenantId,
            },
          },
          select: { role: true },
        });

        if (
          membership?.role !== "OWNER" &&
          membership?.role !== "ADMIN"
        ) {
          return {
            status: 403,
            message: membership
              ? "Only owners and admins can view API keys."
              : "You do not have access to this organization.",
          } as const;
        }

        const keys = await tx.apiKey.findMany({
          where: { tenantId },
          select: {
            id: true,
            name: true,
            createdAt: true,
            lastUsedAt: true,
            revokedAt: true,
          },
          orderBy: { createdAt: "desc" },
        });

        return { status: 200, keys } as const;
      },
    );

    if (result.status !== 200) {
      log("warn", "api_keys_list_access_denied", {
        userId,
        tenantId,
        status: result.status,
      });

      return respond(
        { message: result.message },
        result.status,
      );
    }

    log("info", "api_keys_list_completed", {
      userId,
      tenantId,
      keyCount: result.keys.length,
    });

    return respond({ keys: result.keys });
  } catch (error) {
    log("error", "api_keys_list_failed", {
      error: error instanceof Error
        ? error.message
        : String(error),
    });

    return respond(
      { message: "Could not load API keys." },
      500,
    );
  }
};

export const POST = async (request: Request) => {
  const { requestId, log } = createRequestLogger(request);

  const respond = (
    body: unknown,
    status = 200,
  ) =>
    NextResponse.json(body, {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Request-Id": requestId,
      },
    });

  log("info", "api_key_creation_requested");

  try {
    const session = await auth();
    const userId = session?.user?.id;
    const tenantId = session?.user?.activeTenantId;

    if (!userId) {
      log("warn", "api_key_creation_unauthorized");
      return respond(
        { message: "Please log in first." },
        401,
      );
    }

    if (!tenantId) {
      log("warn", "api_key_creation_missing_active_tenant", {
        userId,
      });

      return respond(
        { message: "Please select an active organization." },
        409,
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      log("warn", "api_key_creation_invalid_json", {
        userId,
        tenantId,
      });

      return respond(
        { message: "Invalid request body." },
        400,
      );
    }

    const parsed = apiKeySchema.safeParse(body);

    if (!parsed.success) {
      log("warn", "api_key_creation_validation_failed", {
        userId,
        tenantId,
      });

      return respond(
        {
          message:
            "API key name must be between 2 and 100 characters.",
        },
        400,
      );
    }

    const result = await prisma.$withTenant(
      userId,
      tenantId,
      async (tx) => {
        const membership = await tx.membership.findUnique({
          where: {
            userId_tenantId: {
              userId,
              tenantId,
            },
          },
          select: { role: true },
        });

        if (
          membership?.role !== "OWNER" &&
          membership?.role !== "ADMIN"
        ) {
          return {
            status: 403,
            message: membership
              ? "Only owners and admins can create API keys."
              : "You do not have access to this organization.",
          } as const;
        }

        const rawKey = createApiKey();
        const keyHash = await hashApiKey(rawKey);
        const keyLookupHash =
          createApiKeyLookupHash(rawKey);

        await tx.apiKey.create({
          data: {
            tenantId,
            createdById: userId,
            name: parsed.data.name,
            keyHash,
            keyLookupHash,
          },
        });

        return {
          status: 201,
          message:
            "API key created successfully. Copy and save it now.",
          apiKey: rawKey,
        } as const;
      },
    );

    if (result.status === 403) {
      log("warn", "api_key_creation_access_denied", {
        userId,
        tenantId,
      });
    } else {
      log("info", "api_key_created", {
        userId,
        tenantId,
        status: result.status,
      });
    }

    // Never log the raw API key.
    return respond(result, result.status);
  } catch (error) {
    log("error", "api_key_creation_failed", {
      error: error instanceof Error
        ? error.message
        : String(error),
    });

    return respond(
      {
        message:
          "Could not create the API key. Please try again.",
      },
      500,
    );
  }
};

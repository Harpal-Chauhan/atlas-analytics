
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  createApiKey,
  createApiKeyLookupHash,
  hashApiKey,
} from "@/lib/api-key";

const apiKeySchema = z.object({
  name: z.string().trim().min(2).max(100),
});

const getSession = async () => {
  return await auth();
};

export const GET = async () => {
  const session = await getSession();
  const userId = session?.user?.id;
  const tenantId = session?.user?.activeTenantId;

  if (!userId) {
    return NextResponse.json(
      { message: "Please log in first." },
      { status: 401 },
    );
  }

  if (!tenantId) {
    return NextResponse.json(
      { message: "Please select an active organization." },
      { status: 409 },
    );
  }

  try {
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
      return NextResponse.json(
        { message: result.message },
        { status: result.status },
      );
    }

    return NextResponse.json(
      { keys: result.keys },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error("API key list error:", error);

    return NextResponse.json(
      { message: "Could not load API keys." },
      { status: 500 },
    );
  }
};

export const POST = async (request: Request) => {
  const session = await getSession();
  const userId = session?.user?.id;
  const tenantId = session?.user?.activeTenantId;

  if (!userId) {
    return NextResponse.json(
      { message: "Please log in first." },
      { status: 401 },
    );
  }

  if (!tenantId) {
    return NextResponse.json(
      { message: "Please select an active organization." },
      { status: 409 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsed = apiKeySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "API key name must be between 2 and 100 characters." },
      { status: 400 },
    );
  }

  try {
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
        const keyLookupHash = createApiKeyLookupHash(rawKey);

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
          message: "API key created successfully. Copy and save it now.",
          apiKey: rawKey,
        } as const;
      },
    );

    return NextResponse.json(result, {
      status: result.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("API key creation error:", error);

    return NextResponse.json(
      { message: "Could not create the API key. Please try again." },
      { status: 500 },
    );
  }
};

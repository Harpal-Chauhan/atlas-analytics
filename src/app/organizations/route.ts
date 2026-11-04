
import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const createOrganizationSchema = z.object({
    name: z.string().trim().min(2).max(100),
});

export const POST = async (request: Request) => {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json(
            { message: "Please log in first." },
            {
                status: 401,
                headers: { "Cache-Control": "no-store" },
            },
        );
    }

    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { message: "Invalid request body." },
            {
                status: 400,
                headers: { "Cache-Control": "no-store" },
            },
        );
    }

    const parsed = createOrganizationSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            {
                message:
                    parsed.error.issues[0]?.message ?? "Invalid organization name.",
            },
            {
                status: 400,
                headers: { "Cache-Control": "no-store" },
            },
        );
    }

    const { name } = parsed.data;

    const baseSlug =
        name
            .toLowerCase()
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 50) || "organization";

    const slug = `${baseSlug}-${randomBytes(4).toString("hex")}`;
    const tenantId = randomUUID();

    try {
        const organization = await prisma.$transaction(async (tx) => {
            await tx.$queryRaw`
        SELECT set_config('app.user_id', ${userId}, true)
      `;

            await tx.$queryRaw`
        SELECT set_config('app.tenant_id', ${tenantId}, true)
      `;

            const tenant = await tx.tenant.create({
                data: {
                    id: tenantId,
                    name,
                    slug,
                },
            });

            await tx.membership.create({
                data: {
                    userId,
                    tenantId: tenant.id,
                    role: "OWNER",
                },
            });

            return tenant;
        });

        return NextResponse.json(
            {
                message: "Organization created successfully.",
                organization,
            },
            {
                status: 201,
                headers: { "Cache-Control": "no-store" },
            },
        );
    } catch (error: unknown) {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "P2002"
        ) {
            return NextResponse.json(
                { message: "Organization could not be created. Please try again." },
                {
                    status: 409,
                    headers: { "Cache-Control": "no-store" },
                },
            );
        }

        console.error("Organization creation error:", error);

        return NextResponse.json(
            { message: "Unable to create organization." },
            {
                status: 500,
                headers: { "Cache-Control": "no-store" },
            },
        );
    }
};

export const GET = async () => {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json(
            { message: "Please log in first." },
            {
                status: 401,
                headers: { "Cache-Control": "no-store" },
            },
        );
    }

    try {
        const organizations = await prisma.$transaction(async (tx) => {
            await tx.$queryRaw`
        SELECT set_config('app.user_id', ${userId}, true)
      `;

            const memberships = await tx.membership.findMany({
                where: { userId },
                select: {
                    tenantId: true,
                    role: true,
                },
            });

            const result = [];

            for (const membership of memberships) {
                await tx.$queryRaw`
          SELECT set_config('app.tenant_id', ${membership.tenantId}, true)
        `;

                const tenant = await tx.tenant.findUnique({
                    where: { id: membership.tenantId },
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        suspendedAt: true,
                    },
                });

                if (tenant) {
                    result.push({
                        id: tenant.id,
                        name: tenant.name,
                        slug: tenant.slug,
                        role: membership.role,
                        suspended: tenant.suspendedAt !== null,
                    });
                }
            }

            return result;
        });

        return NextResponse.json(
            { organizations },
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch (error) {
        console.error("Failed to load organizations:", error);

        return NextResponse.json(
            { message: "Unable to load organizations." },
            {
                status: 500,
                headers: { "Cache-Control": "no-store" },
            },
        );
    }
};

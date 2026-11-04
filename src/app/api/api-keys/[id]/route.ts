
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export const PATCH = async (
    _request: Request,
    context: RouteContext,
) => {
    const session = await auth();
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

    const { id } = await context.params;

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
                            ? "Only owners and admins can revoke API keys."
                            : "You do not have access to this organization.",
                    } as const;
                }

                const apiKey = await tx.apiKey.findFirst({
                    where: {
                        id,
                        tenantId,
                    },
                    select: {
                        id: true,
                        revokedAt: true,
                    },
                });

                if (!apiKey) {
                    return {
                        status: 404,
                        message: "API key not found.",
                    } as const;
                }

                if (apiKey.revokedAt) {
                    return {
                        status: 409,
                        message: "API key is already revoked.",
                    } as const;
                }

                const updated = await tx.apiKey.updateMany({
                    where: {
                        id: apiKey.id,
                        tenantId,
                        revokedAt: null,
                    },
                    data: {
                        revokedAt: new Date(),
                    },
                });

                if (updated.count !== 1) {
                    return {
                        status: 409,
                        message: "API key could not be revoked.",
                    } as const;
                }

                return {
                    status: 200,
                    message: "API key revoked successfully.",
                } as const;
            },
        );

        return NextResponse.json(
            { message: result.message },
            { status: result.status },
        );
    } catch (error) {
        console.error("API key revocation error:", error);

        return NextResponse.json(
            { message: "Could not revoke the API key." },
            { status: 500 },
        );
    }
};

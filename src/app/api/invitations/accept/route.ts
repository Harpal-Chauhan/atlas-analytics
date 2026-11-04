
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const acceptSchema = z.object({
    token: z.string().regex(/^[a-f0-9]{64}$/i, "Invalid invitation token."),
});

export const POST = async (request: Request) => {
    const session = await auth();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email?.toLowerCase();

    if (!userId || !userEmail) {
        return NextResponse.json(
            { message: "Please log in first." },
            { status: 401 },
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

    const parsed = acceptSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { message: "A valid invitation token is required." },
            { status: 400 },
        );
    }

    const tokenHash = createHash("sha256")
        .update(parsed.data.token.toLowerCase())
        .digest("hex");

    try {
        const result = await prisma.$transaction(async (tx) => {
            await tx.$queryRaw`
        SELECT set_config('app.user_id', ${userId}, true)
      `;

            await tx.$queryRaw`
        SELECT set_config('app.invitation_token_hash', ${tokenHash}, true)
      `;

            const invitation = await tx.invitation.findUnique({
                where: { tokenHash },
            });

            if (!invitation) {
                return {
                    status: 404,
                    message: "Invitation not found or invalid.",
                };
            }

            if (invitation.email.toLowerCase() !== userEmail) {
                return {
                    status: 403,
                    message: "This invitation belongs to a different email address.",
                };
            }

            if (invitation.acceptedAt) {
                return {
                    status: 409,
                    message: "This invitation has already been accepted.",
                };
            }

            const now = new Date();

            if (invitation.expiresAt <= now) {
                return {
                    status: 410,
                    message: "This invitation has expired.",
                };
            }

            await tx.$queryRaw`
        SELECT set_config('app.tenant_id', ${invitation.tenantId}, true)
      `;

            const tenant = await tx.tenant.findUnique({
                where: { id: invitation.tenantId },
                select: { id: true, suspendedAt: true },
            });

            if (!tenant || tenant.suspendedAt) {
                return {
                    status: 403,
                    message: "This organization is unavailable.",
                };
            }

            const existingMembership = await tx.membership.findUnique({
                where: {
                    userId_tenantId: {
                        userId,
                        tenantId: invitation.tenantId,
                    },
                },
                select: { id: true },
            });

            if (existingMembership) {
                return {
                    status: 409,
                    message: "You are already a member of this organization.",
                };
            }

            const updated = await tx.invitation.updateMany({
                where: {
                    id: invitation.id,
                    acceptedAt: null,
                    expiresAt: { gt: now },
                },
                data: { acceptedAt: now },
            });

            if (updated.count !== 1) {
                return {
                    status: 409,
                    message: "This invitation has already been used or expired.",
                };
            }

            await tx.membership.create({
                data: {
                    userId,
                    tenantId: invitation.tenantId,
                    role: invitation.role,
                },
            });

            return {
                status: 200,
                message: "Invitation accepted successfully.",
                organizationId: invitation.tenantId,
            };
        });

        return NextResponse.json(result, {
            status: result.status,
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        console.error("Invitation acceptance error:", error);

        return NextResponse.json(
            { message: "Could not accept the invitation." },
            { status: 500 },
        );
    }
};


import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createRequestLogger } from "@/lib/request-logger";

const acceptSchema = z.object({
    token: z.string().regex(/^[a-f0-9]{64}$/i, "Invalid invitation token."),
});

export const POST = async (request: Request) => {
    const { requestId, log } = createRequestLogger(request);

    const respond = (
        data: Record<string, unknown>,
        status: number,
    ) => {
        return NextResponse.json(data, {
            status,
            headers: {
                "Cache-Control": "no-store",
                "X-Request-Id": requestId,
            },
        });
    };

    log("info", "invitation_accept_started");

    try {
        const session = await auth();
        const userId = session?.user?.id;
        const userEmail = session?.user?.email?.toLowerCase();

        if (!userId || !userEmail) {
            log("warn", "invitation_accept_unauthorized");

            return respond(
                { message: "Please log in first." },
                401,
            );
        }

        let body: unknown;

        try {
            body = await request.json();
        } catch {
            log("warn", "invitation_accept_invalid_body");

            return respond(
                { message: "Invalid request body." },
                400,
            );
        }

        const parsed = acceptSchema.safeParse(body);

        if (!parsed.success) {
            log("warn", "invitation_accept_invalid_token");

            return respond(
                { message: "A valid invitation token is required." },
                400,
            );
        }

        const tokenHash = createHash("sha256")
            .update(parsed.data.token.toLowerCase())
            .digest("hex");

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

        if (result.status === 200) {
            log("info", "invitation_accept_completed", {
                organizationId: result.organizationId,
                status: result.status,
            });
        } else {
            log("warn", "invitation_accept_rejected", {
                status: result.status,
            });
        }

        return respond(result, result.status);
    } catch (error) {
        log("error", "invitation_accept_failed", {
            error: error instanceof Error ? error.message : "Unknown error",
        });

        return respond(
            { message: "Could not accept the invitation." },
            500,
        );
    }
};

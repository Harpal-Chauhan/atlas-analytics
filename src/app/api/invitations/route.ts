
import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendInvitationEmail } from "@/lib/email";
import { createRequestLogger } from "@/lib/request-logger";

const invitationSchema = z.object({
    email: z.string()
        .trim()
        .email()
        .max(254)
        .transform((value) => value.toLowerCase()),
    role: z.enum(["ADMIN", "VIEWER"]),
});

export const POST = async (request: Request) => {
    const { requestId, log } = createRequestLogger(request);

    const respond = (body: unknown, status = 200) =>
        NextResponse.json(body, {
            status,
            headers: {
                "Cache-Control": "no-store",
                "X-Request-Id": requestId,
            },
        });

    log("info", "invitation_creation_requested");

    try {
        const session = await auth();
        const userId = session?.user?.id;
        const activeTenantId = session?.user?.activeTenantId;

        if (!userId) {
            log("warn", "invitation_creation_unauthorized");
            return respond({ message: "Please log in first." }, 401);
        }

        if (!activeTenantId) {
            log("warn", "invitation_creation_missing_active_tenant", {
                userId,
            });

            return respond(
                { message: "Select an active organization first." },
                409,
            );
        }

        let body: unknown;

        try {
            body = await request.json();
        } catch {
            log("warn", "invitation_creation_invalid_json", {
                userId,
                tenantId: activeTenantId,
            });

            return respond({ message: "Invalid request body." }, 400);
        }

        const parsed = invitationSchema.safeParse(body);

        if (!parsed.success) {
            log("warn", "invitation_creation_validation_failed", {
                userId,
                tenantId: activeTenantId,
            });

            return respond(
                {
                    message:
                        parsed.error.issues[0]?.message ??
                        "Invalid invitation details.",
                },
                400,
            );
        }

        const { email, role } = parsed.data;

        if (email === session.user?.email?.toLowerCase()) {
            log("warn", "invitation_self_invite_rejected", {
                userId,
                tenantId: activeTenantId,
            });

            return respond(
                { message: "You cannot invite yourself." },
                400,
            );
        }

        const rawToken = randomBytes(32).toString("hex");

        const tokenHash = createHash("sha256")
            .update(rawToken)
            .digest("hex");

        const result = await prisma.$withTenant(
            userId,
            activeTenantId,
            async (tx) => {
                const membership = await tx.membership.findUnique({
                    where: {
                        userId_tenantId: {
                            userId,
                            tenantId: activeTenantId,
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
                            ? "Only owners and admins can invite members."
                            : "Organization membership not found.",
                    } as const;
                }

                const existingUser = await tx.user.findUnique({
                    where: { email },
                    select: { id: true },
                });

                if (existingUser) {
                    const existingMembership =
                        await tx.membership.findUnique({
                            where: {
                                userId_tenantId: {
                                    userId: existingUser.id,
                                    tenantId: activeTenantId,
                                },
                            },
                            select: { id: true },
                        });

                    if (existingMembership) {
                        return {
                            status: 409,
                            message: "This user is already a member.",
                        } as const;
                    }
                }

                const existingInvitation =
                    await tx.invitation.findFirst({
                        where: {
                            tenantId: activeTenantId,
                            email,
                            acceptedAt: null,
                            expiresAt: { gt: new Date() },
                        },
                        select: { id: true },
                    });

                if (existingInvitation) {
                    return {
                        status: 409,
                        message:
                            "An active invitation already exists for this email.",
                    } as const;
                }

                const tenant = await tx.tenant.findUnique({
                    where: { id: activeTenantId },
                    select: { name: true },
                });

                if (!tenant) {
                    return {
                        status: 404,
                        message: "Organization not found.",
                    } as const;
                }

                await tx.invitation.create({
                    data: {
                        tenantId: activeTenantId,
                        email,
                        role,
                        tokenHash,
                        invitedById: userId,
                        expiresAt: new Date(
                            Date.now() + 7 * 24 * 60 * 60 * 1000,
                        ),
                    },
                });

                return {
                    status: 201,
                    message: "Invitation created successfully.",
                    organizationName: tenant.name,
                } as const;
            },
        );

        if (result.status !== 201) {
            log("warn", "invitation_creation_not_completed", {
                userId,
                tenantId: activeTenantId,
                status: result.status,
            });

            return respond(
                { message: result.message },
                result.status,
            );
        }

        const origin = new URL(request.url).origin;

        const invitationUrl =
            `${origin}/invitations/accept?token=${rawToken}`;

        if (process.env.NODE_ENV !== "development") {
            try {
                await sendInvitationEmail({
                    email,
                    organizationName: result.organizationName,
                    invitationUrl,
                    role,
                });
            } catch (error) {
                log("error", "invitation_email_delivery_failed", {
                    tenantId: activeTenantId,
                    error: error instanceof Error
                        ? error.message
                        : String(error),
                });

                await prisma.$withTenant(
                    userId,
                    activeTenantId,
                    async (tx) => {
                        await tx.invitation.deleteMany({
                            where: {
                                tenantId: activeTenantId,
                                tokenHash,
                            },
                        });
                    },
                );

                return respond(
                    { message: "Could not send invitation email." },
                    502,
                );
            }
        }

        log("info", "invitation_created", {
            userId,
            tenantId: activeTenantId,
            role,
            email,
            emailSkipped: process.env.NODE_ENV === "development",
        });

        return respond(
            {
                message:
                    process.env.NODE_ENV === "development"
                        ? "Invitation created. Email skipped in development."
                        : "Invitation email sent successfully.",
                invitationUrl,
                expiresInDays: 7,
            },
            201,
        );
    } catch (error) {
        log("error", "invitation_creation_failed", {
            error: error instanceof Error
                ? error.message
                : String(error),
        });

        return respond(
            { message: "Could not create the invitation." },
            500,
        );
    }
};

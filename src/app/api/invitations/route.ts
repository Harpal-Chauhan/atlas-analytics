import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendInvitationEmail } from "@/lib/email";

const invitationSchema = z.object({
    email: z.string()
        .trim()
        .email()
        .max(254)
        .transform((value) => value.toLowerCase()),
    role: z.enum(["ADMIN", "VIEWER"]),
});

export const POST = async (request: Request) => {
    const session = await auth();
    const userId = session?.user?.id;
    const activeTenantId = session?.user?.activeTenantId;

    if (!userId) {
        return NextResponse.json(
            { message: "Please log in first." },
            { status: 401 },
        );
    }

    if (!activeTenantId) {
        return NextResponse.json(
            { message: "Select an active organization first." },
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

    const parsed = invitationSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            {
                message:
                    parsed.error.issues[0]?.message ??
                    "Invalid invitation details.",
            },
            { status: 400 },
        );
    }

    const { email, role } = parsed.data;

    if (email === session.user?.email?.toLowerCase()) {
        return NextResponse.json(
            { message: "You cannot invite yourself." },
            { status: 400 },
        );
    }

    try {
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
            return NextResponse.json(
                { message: result.message },
                { status: result.status },
            );
        }

        const origin = new URL(request.url).origin;

        const invitationUrl =
            `${origin}/invitations/accept?token=${rawToken}`;

        // Local development: skip email and return the invitation link.
        if (process.env.NODE_ENV !== "development") {
            try {
                await sendInvitationEmail({
                    email,
                    organizationName: result.organizationName,
                    invitationUrl,
                    role,
                });
            } catch (error) {
                console.error(
                    "Invitation email delivery failed:",
                    error,
                );

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

                return NextResponse.json(
                    { message: "Could not send invitation email." },
                    { status: 502 },
                );
            }
        }

        return NextResponse.json(
            {
                message:
                    process.env.NODE_ENV === "development"
                        ? "Invitation created. Email skipped in development."
                        : "Invitation email sent successfully.",
                invitationUrl,
                expiresInDays: 7,
            },
            {
                status: 201,
                headers: { "Cache-Control": "no-store" },
            },
        );
    } catch (error) {
        console.error("Invitation creation error:", error);

        return NextResponse.json(
            { message: "Could not create the invitation." },
            { status: 500 },
        );
    }
};
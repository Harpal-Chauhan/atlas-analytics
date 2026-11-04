
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

const loginSchema = z.object({
    email: z.string().trim().email().max(254),
    password: z.string().min(1).max(128),
});

const tenantIdSchema = z.string().min(1).max(128)

export const { handlers, auth, signIn, signOut } = NextAuth({
    session: {
        strategy: "jwt",
    },

    providers: [
        Credentials({
            credentials: {
                email: {
                    label: "Email",
                    type: "email",
                },
                password: {
                    label: "Password",
                    type: "password",
                },
            },

            authorize: async (credentials) => {
                const parsed = loginSchema.safeParse(credentials);

                if (!parsed.success) {
                    return null;
                }

                const email = parsed.data.email.toLowerCase();

                const user = await prisma.user.findUnique({
                    where: { email },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        passwordHash: true,
                    },
                });

                if (!user?.passwordHash) {
                    return null;
                }

                const isValid = await verifyPassword(
                    parsed.data.password,
                    user.passwordHash,
                );

                if (!isValid) {
                    return null;
                }

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                };
            },
        }),
    ],

    callbacks: {
        jwt: async ({ token, user, trigger, session }) => {
            if (user) {
                token.id = user.id;

                const membership = await prisma.$transaction(async (tx) => {
                    await tx.$queryRaw`
                        SELECT set_config('app.user_id', ${user.id}, true)
                    `;

                    const memberships = await tx.membership.findMany({
                        where: { userId: user.id },
                        select: { tenantId: true },
                    });

                    for (const item of memberships) {
                        await tx.$queryRaw`
                        SELECT set_config('app.tenant_id', ${item.tenantId}, true)
                    `;

                        const tenant = await tx.tenant.findUnique({
                            where: { id: item.tenantId },
                            select: { suspendedAt: true },
                        });

                        if (tenant && tenant.suspendedAt === null) {
                            return item;
                        }
                    }

                    return null;
                });

                if (membership) {
                    token.activeTenantId = membership.tenantId;
                }
            }

            // Validate organization changes requested by the client.
            if (trigger === "update" && typeof token.id === "string") {
                const parsedTenantId = tenantIdSchema.safeParse(
                    session?.activeTenantId
                )

                if (parsedTenantId.success) {
                    const requestedTenantId = parsedTenantId.data

                    const isAuthorized = await prisma.$transaction(async (tx) => {
                        await tx.$queryRaw`
                            SELECT set_config('app.user_id', ${token.id as string}, true)
                        `

                        const membership = await tx.membership.findUnique({
                            where: {
                                userId_tenantId: {
                                    userId: token.id as string,
                                    tenantId: requestedTenantId
                                }
                            },
                            select: { id: true }
                        })

                        if (!membership) {
                            return false
                        }

                        await tx.$queryRaw`
                            SELECT set_config('app.tenant_id', ${requestedTenantId}, true)
                        `

                        const tenant = await tx.tenant.findUnique({
                            where: { id: requestedTenantId },
                            select: { suspendedAt: true }
                        })

                        return Boolean(tenant && tenant.suspendedAt === null)
                    })

                    if (isAuthorized) {
                        token.activeTenantId = requestedTenantId
                    }
                }
            }

            return token;
        },

        session: async ({ session, token }) => {
            if (session.user && token.id) {
                session.user.id = String(token.id);
            }

            if (session.user && token.activeTenantId) {
                session.user.activeTenantId = String(token.activeTenantId);
            }

            return session;
        },
    },

    pages: {
        signIn: "/login",
    },
});


import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { createRequestLogger } from "@/lib/request-logger";

const signupSchema = z.object({
    company: z.string().trim()
        .min(2, "Company name must be at least 2 characters.")
        .max(100, "Company name is too long."),
    name: z.string().trim()
        .min(2, "Full name must be at least 2 characters.")
        .max(100, "Full name is too long."),
    email: z.string().trim()
        .email("Enter a valid email address.")
        .max(254, "Email address is too long.")
        .transform((value) => value.toLowerCase()),
    password: z.string()
        .min(8, "Password must be at least 8 characters.")
        .max(128, "Password cannot exceed 128 characters."),
});

export async function POST(request: Request) {
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

    log("info", "signup_started");

    let body: unknown;

    try {
        body = await request.json();
    } catch {
        log("warn", "signup_invalid_request_body");

        return respond(
            { message: "Invalid request. Please check your form and try again." },
            400,
        );
    }

    const result = signupSchema.safeParse(body);

    if (!result.success) {
        log("warn", "signup_validation_failed", {
            invalidFields: [
                ...new Set(
                    result.error.issues.map((issue) =>
                        String(issue.path[0] ?? ""),
                    ),
                ),
            ],
        });

        return respond(
            {
                message: result.error.issues[0]?.message ?? "Please check your details.",
                errors: result.error.issues.map((issue) => ({
                    field: String(issue.path[0] ?? ""),
                    message: issue.message,
                })),
            },
            400,
        );
    }

    const { company, name, email, password } = result.data;

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });

        if (existingUser) {
            log("warn", "signup_email_already_registered");

            return respond(
                { message: "An account with this email already exists." },
                409,
            );
        }

        const passwordHash = await hashPassword(password);

        const baseSlug =
            company
                .toLowerCase()
                .normalize("NFKD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "")
                .slice(0, 50) || "company";

        const slug = `${baseSlug}-${randomBytes(4).toString("hex")}`;

        const created = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    passwordHash,
                },
                select: { id: true },
            });

            const tenantId = randomUUID();

            await tx.$queryRaw`
                SELECT set_config('app.tenant_id', ${tenantId}, true)
            `;

            const tenant = await tx.tenant.create({
                data: {
                    id: tenantId,
                    name: company,
                    slug,
                },
                select: { id: true },
            });

            await tx.membership.create({
                data: {
                    userId: user.id,
                    tenantId: tenant.id,
                    role: "OWNER",
                },
            });

            return {
                userId: user.id,
                organizationId: tenant.id,
            };
        });

        log("info", "signup_completed", {
            userId: created.userId,
            organizationId: created.organizationId,
            status: 201,
        });

        return respond(
            { message: "Your account has been created successfully." },
            201,
        );
    } catch (error: unknown) {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "P2002"
        ) {
            log("warn", "signup_duplicate_record");

            return respond(
                {
                    message: "This email may already be registered. Please check and try again.",
                },
                409,
            );
        }

        log("error", "signup_failed", {
            error: error instanceof Error ? error.message : "Unknown error",
        });

        return respond(
            {
                message: "We could not create your account right now. Please try again later.",
            },
            500,
        );
    }
}

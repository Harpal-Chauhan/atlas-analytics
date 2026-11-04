
import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const signupSchema = z.object({
    company: z.string().trim().min(2, "Company name must be at least 2 characters.").max(100, "Company name is too long."),
    name: z.string().trim().min(2, "Full name must be at least 2 characters.").max(100, "Full name is too long."),
    email: z.string().trim().email("Enter a valid email address.").max(254, "Email address is too long.").transform((value) => value.toLowerCase()),
    password: z.string().min(8, "Password must be at least 8 characters.").max(128, "Password cannot exceed 128 characters."),
});

export async function POST(request: Request) {
    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { message: "Invalid request. Please check your form and try again." },
            { status: 400 },
        );
    }

    const result = signupSchema.safeParse(body);

    if (!result.success) {
        return NextResponse.json(
            {
                message: result.error.issues[0]?.message ?? "Please check your details.",
                errors: result.error.issues.map((issue) => ({
                    field: String(issue.path[0] ?? ""),
                    message: issue.message,
                })),
            },
            { status: 400 },
        );
    }

    const { company, name, email, password } = result.data;

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });

        if (existingUser) {
            return NextResponse.json(
                { message: "An account with this email already exists." },
                { status: 409 },
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

        await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    passwordHash,
                },
            });

            const tenantId = randomUUID()

            await tx.$queryRaw`
                SELECT set_config('app.tenant_id', ${tenantId}, true)
            `

            const tenant = await tx.tenant.create({
                data: {
                    id: tenantId,
                    name: company,
                    slug
                }
            })

            await tx.membership.create({
                data: {
                    userId: user.id,
                    tenantId: tenant.id,
                    role: "OWNER",
                },
            });
        });

        return NextResponse.json(
            { message: "Your account has been created successfully." },
            { status: 201 },
        );
    } catch (error: unknown) {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "P2002"
        ) {
            return NextResponse.json(
                { message: "This email may already be registered. Please check and try again." },
                { status: 409 },
            );
        }

        console.error("Signup error:", error);

        return NextResponse.json(
            { message: "We could not create your account right now. Please try again later." },
            { status: 500 },
        );
    }
}

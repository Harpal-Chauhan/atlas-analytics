
import { NextResponse } from "next/server";
import { getOpsUser } from "@/lib/ops-auth";
import { opsPrisma } from "@/lib/ops-prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export const PATCH = async (
    request: Request,
    { params }: RouteContext,
) => {
    const opsUser = await getOpsUser();

    if (!opsUser) {
        return NextResponse.json(
            { error: "Ops access required." },
            { status: 403 },
        );
    }

    const { id } = await params;

    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid request body." },
            { status: 400 },
        );
    }

    if (
        typeof body !== "object" ||
        body === null ||
        !("suspended" in body) ||
        typeof body.suspended !== "boolean"
    ) {
        return NextResponse.json(
            { error: "A boolean suspended value is required." },
            { status: 400 },
        );
    }

    try {
        const tenant = await opsPrisma.tenant.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!tenant) {
            return NextResponse.json(
                { error: "Tenant not found." },
                { status: 404 },
            );
        }

        const updatedTenant = await opsPrisma.tenant.update({
            where: { id },
            data: {
                suspendedAt: body.suspended ? new Date() : null,
            },
            select: {
                id: true,
                name: true,
                suspendedAt: true,
            },
        });

        return NextResponse.json({
            message: body.suspended
                ? "Tenant suspended successfully."
                : "Tenant unsuspended successfully.",
            tenant: updatedTenant,
        });
    } catch {
        return NextResponse.json(
            { error: "Unable to update tenant status." },
            { status: 500 },
        );
    }
};

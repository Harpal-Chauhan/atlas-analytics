
import { NextResponse } from "next/server";

import { getOpsUser } from "@/lib/ops-auth";
import { opsPrisma } from "@/lib/ops-prisma";
import { createRequestLogger } from "@/lib/request-logger";

export const dynamic = "force-dynamic";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export const PATCH = async (
    request: Request,
    { params }: RouteContext,
) => {
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

    log("info", "ops_tenant_suspension_started");

    try {
        const opsUser = await getOpsUser();

        if (!opsUser) {
            log("warn", "ops_tenant_suspension_forbidden");

            return respond(
                { error: "Ops access required." },
                403,
            );
        }

        const { id } = await params;

        let body: unknown;

        try {
            body = await request.json();
        } catch {
            log("warn", "ops_tenant_suspension_invalid_body");

            return respond(
                { error: "Invalid request body." },
                400,
            );
        }

        if (
            typeof body !== "object" ||
            body === null ||
            !("suspended" in body) ||
            typeof body.suspended !== "boolean"
        ) {
            log("warn", "ops_tenant_suspension_invalid_value", {
                tenantId: id,
            });

            return respond(
                { error: "A boolean suspended value is required." },
                400,
            );
        }

        const tenant = await opsPrisma.tenant.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!tenant) {
            log("warn", "ops_tenant_suspension_tenant_not_found", {
                tenantId: id,
            });

            return respond(
                { error: "Tenant not found." },
                404,
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

        log("info", "ops_tenant_suspension_updated", {
            tenantId: updatedTenant.id,
            suspended: body.suspended,
            opsUserId: opsUser.userId,
        });

        return respond(
            {
                message: body.suspended
                    ? "Tenant suspended successfully."
                    : "Tenant unsuspended successfully.",
                tenant: updatedTenant,
            },
            200,
        );
    } catch (error) {
        log("error", "ops_tenant_suspension_failed", {
            error: error instanceof Error ? error.message : "Unknown error",
        });

        return respond(
            { error: "Unable to update tenant status." },
            500,
        );
    }
};

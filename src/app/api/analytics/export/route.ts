
import { auth } from "@/auth";
import { Prisma } from "@/generated/prisma/client";
import { withTenant } from "@/lib/tenant-db";
import { createCsvRow } from "@/lib/csv";
import { getDateRange } from "@/app/dashboard/analytics-utils";
import { z } from "zod";

export const dynamic = "force-dynamic";

type FunnelCountRow = {
    stepNumber: number;
    reachedUsers: bigint;
};

type CsvRow = string[];

const exportSchema = z.object({
    view: z.enum(["overview", "top-events", "funnel", "retention"]),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    steps: z.array(z.string().min(1)).optional(),
    conversionWindowDays: z.coerce.number().int().min(1).max(30).default(7),
});

const createCsvStream = (rows: CsvRow[]) => {
    const encoder = new TextEncoder();
    let index = 0;

    return new ReadableStream<Uint8Array>({
        pull: (controller) => {
            const row = rows[index];

            if (!row) {
                controller.close();
                return;
            }

            controller.enqueue(
                encoder.encode(createCsvRow(row)),
            );

            index += 1;
        },
    });
};

export const GET = async (request: Request) => {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        const tenantId = session?.user?.activeTenantId;

        if (!userId || !tenantId) {
            return Response.json(
                { error: "Unauthorized." },
                { status: 401 },
            );
        }

        const url = new URL(request.url);

        const parsed = exportSchema.safeParse({
            view: url.searchParams.get("view"),
            startDate: url.searchParams.get("startDate") ?? undefined,
            endDate: url.searchParams.get("endDate") ?? undefined,
            steps: url.searchParams.getAll("step"),
            conversionWindowDays:
                url.searchParams.get("conversionWindowDays") ?? 7,
        });

        if (!parsed.success) {
            return Response.json(
                { error: "Invalid export parameters." },
                { status: 400 },
            );
        }

        const {
            view,
            startDate,
            endDate,
            steps,
            conversionWindowDays,
        } = parsed.data;

        if (
            view === "funnel" &&
            (!steps || steps.length < 2 || steps.length > 6 ||
                new Set(steps).size !== steps.length)
        ) {
            return Response.json(
                { error: "Funnel requires 2 to 6 unique steps." },
                { status: 400 },
            );
        }

        const range = getDateRange(startDate, endDate);
        const selectedStart = range.startDate;
        const selectedEnd = range.endDate;

        const startLabel = selectedStart.toISOString().slice(0, 10);
        const endLabel = new Date(
            selectedEnd.getTime() - 86400000,
        ).toISOString().slice(0, 10);

        const rows: CsvRow[] = [];

        await withTenant(userId, tenantId, async (tx) => {
            if (view === "overview") {
                const [totalEvents, dailyUsers] = await Promise.all([
                    tx.tenantDailyRollup.aggregate({
                        where: {
                            tenantId,
                            bucketStart: {
                                gte: selectedStart,
                                lt: selectedEnd,
                            },
                        },
                        _sum: {
                            eventCount: true,
                        },
                    }),
                    tx.tenantUserActivityDaily.findMany({
                        where: {
                            tenantId,
                            bucketStart: {
                                gte: new Date(
                                    selectedEnd.getTime() - 29 * 86400000,
                                ),
                                lt: selectedEnd,
                            },
                        },
                        select: {
                            bucketStart: true,
                            distinctId: true,
                        },
                    }),
                ]);

                const activeUsers = new Map<string, Set<string>>();

                for (const row of dailyUsers) {
                    const date = row.bucketStart
                        .toISOString()
                        .slice(0, 10);

                    const users =
                        activeUsers.get(date) ?? new Set<string>();

                    users.add(row.distinctId);
                    activeUsers.set(date, users);
                }

                const dauDate = new Date(
                    selectedEnd.getTime() - 86400000,
                ).toISOString().slice(0, 10);

                const dau = activeUsers.get(dauDate)?.size ?? 0;

                const wauUsers = new Set<string>();
                const mauUsers = new Set<string>();

                for (const row of dailyUsers) {
                    const daysAgo = Math.floor(
                        (selectedEnd.getTime() - row.bucketStart.getTime()) /
                        86400000,
                    );

                    if (daysAgo <= 7) {
                        wauUsers.add(row.distinctId);
                    }

                    if (daysAgo <= 30) {
                        mauUsers.add(row.distinctId);
                    }
                }

                rows.push(
                    ["Metric", "Value"],
                    [
                        "Total Events",
                        String(totalEvents._sum.eventCount ?? 0),
                    ],
                    ["DAU", String(dau)],
                    ["WAU", String(wauUsers.size)],
                    ["MAU", String(mauUsers.size)],
                );
            }

            if (view === "top-events") {
                const grouped = await tx.eventDailyRollup.groupBy({
                    by: ["eventName"],
                    where: {
                        tenantId,
                        bucketStart: {
                            gte: selectedStart,
                            lt: selectedEnd,
                        },
                    },
                    _sum: {
                        eventCount: true,
                    },
                    orderBy: {
                        _sum: {
                            eventCount: "desc",
                        },
                    },
                    take: 5,
                });

                rows.push(["Event Name", "Event Count"]);

                for (const event of grouped) {
                    rows.push([
                        event.eventName,
                        String(event._sum.eventCount ?? 0),
                    ]);
                }
            }

            if (view === "funnel") {
                const requestedSteps = steps!;

                const requestedStepValues = Prisma.join(
                    requestedSteps.map((eventName, index) =>
                        Prisma.sql`(${index + 1}, ${eventName})`,
                    ),
                );

                const funnelRows = await tx.$queryRaw<FunnelCountRow[]>(
                    Prisma.sql`
                        WITH RECURSIVE requested_steps(
                            "stepNumber",
                            "eventName"
                        ) AS (
                            VALUES ${requestedStepValues}
                        ),

                        first_step_events AS (
                            SELECT
                                e."distinctId",
                                MIN(e."occurredAt") AS "cohortAt"
                            FROM "Event" e
                            WHERE
                                e."tenantId" = ${tenantId}
                                AND e."eventName" = ${requestedSteps[0]}
                                AND e."occurredAt" >= ${selectedStart}
                                AND e."occurredAt" < ${selectedEnd}
                            GROUP BY e."distinctId"
                        ),

                        funnel_progress AS (
                            SELECT
                                f."distinctId",
                                1::int AS "stepNumber",
                                f."cohortAt" AS "stepAt",
                                f."cohortAt"
                            FROM first_step_events f

                            UNION ALL

                            SELECT
                                fp."distinctId",
                                rs."stepNumber"::int,
                                next_event."occurredAt",
                                fp."cohortAt"
                            FROM funnel_progress fp

                            JOIN requested_steps rs
                                ON rs."stepNumber" = fp."stepNumber" + 1

                            CROSS JOIN LATERAL (
                                SELECT e."occurredAt"
                                FROM "Event" e
                                WHERE
                                    e."tenantId" = ${tenantId}
                                    AND e."distinctId" = fp."distinctId"
                                    AND e."eventName" = rs."eventName"
                                    AND e."occurredAt" > fp."stepAt"
                                    AND e."occurredAt" <=
                                        fp."cohortAt" +
                                        (${conversionWindowDays} * INTERVAL '1 day')
                                ORDER BY e."occurredAt" ASC
                                LIMIT 1
                            ) next_event
                        ),

                        step_counts AS (
                            SELECT
                                "stepNumber",
                                COUNT(*)::bigint AS "reachedUsers"
                            FROM funnel_progress
                            GROUP BY "stepNumber"
                        )

                        SELECT
                            rs."stepNumber",
                            COALESCE(
                                sc."reachedUsers",
                                0
                            )::bigint AS "reachedUsers"
                        FROM requested_steps rs
                        LEFT JOIN step_counts sc
                            ON sc."stepNumber" = rs."stepNumber"
                        ORDER BY rs."stepNumber"
                    `,
                );

                const counts = funnelRows.map((row) =>
                    Number(row.reachedUsers),
                );

                const totalUsers = counts[0] ?? 0;

                rows.push([
                    "Step",
                    "Event Name",
                    "Reached Users",
                    "Conversion Rate (%)",
                    "Drop-off",
                ]);

                requestedSteps.forEach((eventName, index) => {
                    const reachedUsers = counts[index] ?? 0;

                    const previousCount =
                        index === 0
                            ? totalUsers
                            : counts[index - 1] ?? 0;

                    const conversionRate =
                        previousCount === 0
                            ? 0
                            : (reachedUsers / previousCount) * 100;

                    rows.push([
                        String(index + 1),
                        eventName,
                        String(reachedUsers),
                        conversionRate.toFixed(2),
                        String(previousCount - reachedUsers),
                    ]);
                });
            }

            if (view === "retention") {
                const activity = await tx.tenantUserActivityDaily.findMany({
                    where: {
                        tenantId,
                        bucketStart: {
                            gte: new Date(
                                selectedStart.getTime() - 84 * 86400000,
                            ),
                            lt: selectedEnd,
                        },
                    },
                    select: {
                        distinctId: true,
                        bucketStart: true,
                    },
                    orderBy: {
                        bucketStart: "asc",
                    },
                });

                const firstActivity = new Map<string, Date>();

                for (const row of activity) {
                    const previous = firstActivity.get(row.distinctId);

                    if (!previous || row.bucketStart < previous) {
                        firstActivity.set(row.distinctId, row.bucketStart);
                    }
                }

                const cohorts = new Map<
                    string,
                    {
                        users: Set<string>;
                        active: Map<number, Set<string>>;
                    }
                >();

                for (const row of activity) {
                    const firstDate = firstActivity.get(row.distinctId);

                    if (!firstDate || firstDate < selectedStart) {
                        continue;
                    }

                    const cohortDate = new Date(firstDate);

                    cohortDate.setUTCDate(
                        cohortDate.getUTCDate() - cohortDate.getUTCDay(),
                    );

                    cohortDate.setUTCHours(0, 0, 0, 0);

                    const cohortKey = cohortDate
                        .toISOString()
                        .slice(0, 10);

                    const weekNumber = Math.floor(
                        (row.bucketStart.getTime() - cohortDate.getTime()) /
                        (7 * 86400000),
                    );

                    if (weekNumber < 0 || weekNumber > 11) {
                        continue;
                    }

                    const cohort = cohorts.get(cohortKey) ?? {
                        users: new Set<string>(),
                        active: new Map<number, Set<string>>(),
                    };

                    cohort.users.add(row.distinctId);

                    const users =
                        cohort.active.get(weekNumber) ?? new Set<string>();

                    users.add(row.distinctId);
                    cohort.active.set(weekNumber, users);
                    cohorts.set(cohortKey, cohort);
                }

                rows.push([
                    "Cohort Week",
                    "Cohort Size",
                    "Week Number",
                    "Active Users",
                    "Retention Rate (%)",
                ]);

                for (const [cohortWeek, cohort] of cohorts) {
                    for (let week = 0; week <= 11; week += 1) {
                        const activeUsers =
                            cohort.active.get(week)?.size ?? 0;

                        rows.push([
                            cohortWeek,
                            String(cohort.users.size),
                            String(week),
                            String(activeUsers),
                            cohort.users.size > 0
                                ? (
                                    (activeUsers / cohort.users.size) * 100
                                ).toFixed(2)
                                : "0.00",
                        ]);
                    }
                }
            }
        });

        const filename =
            `atlas-${view}-${startLabel}-${endLabel}.csv`;

        return new Response(createCsvStream(rows), {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition":
                    `attachment; filename="${filename}"`,
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch (error) {
        console.error("Analytics CSV export failed:", error);

        return Response.json(
            { error: "Unable to export analytics." },
            { status: 500 },
        );
    }
};

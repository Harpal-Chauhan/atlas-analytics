
import { auth } from "@/auth";
import { Prisma } from "@/generated/prisma/client";
import { withTenant } from "@/lib/tenant-db";
import { createCsvRow } from "@/lib/csv";
import { getDateRange } from "@/app/dashboard/analytics-utils";
import { createRequestLogger } from "@/lib/request-logger";
import { z } from "zod";

export const dynamic = "force-dynamic";

type FunnelCountRow = {
    stepNumber: number;
    reachedUsers: bigint;
};

type RetentionRow = {
    cohortWeek: string;
    cohortSize: bigint;
    weekNumber: number;
    activeUsers: bigint;
};

type CsvRow = string[];

const BATCH_SIZE = 500;

const exportSchema = z.object({
    view: z.enum(["overview", "top-events", "funnel", "retention"]),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    steps: z.array(z.string().min(1)).optional(),
    conversionWindowDays: z.coerce.number().int().min(1).max(30).default(7),
});

type ExportOptions = {
    userId: string;
    tenantId: string;
    view: "overview" | "top-events" | "funnel" | "retention";
    selectedStart: Date;
    selectedEnd: Date;
    steps?: string[];
    conversionWindowDays: number;
};

async function* generateCsvRows(
    options: ExportOptions
): AsyncGenerator<CsvRow> {
    const {
        userId,
        tenantId,
        view,
        selectedStart,
        selectedEnd,
        steps,
        conversionWindowDays,
    } = options;

    // OVERVIEW EXPORT
    if (view === "overview") {
        const data = await withTenant(userId, tenantId, async (tx) => {
            const dauStart = new Date(
                selectedEnd.getTime() - 1 * 86400000
            );

            const wauStart = new Date(
                selectedEnd.getTime() - 7 * 86400000
            );

            const mauStart = new Date(
                selectedEnd.getTime() - 30 * 86400000
            );

            const [totalEvents, activeUserCounts] = await Promise.all([
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

                tx.$queryRaw<{
                    dau: bigint;
                    wau: bigint;
                    mau: bigint;
                }[]>(Prisma.sql`
                    SELECT
                        COUNT(DISTINCT "distinctId") FILTER (
                            WHERE "bucketStart" >= ${dauStart}
                        ) AS dau,
                        COUNT(DISTINCT "distinctId") FILTER (
                            WHERE "bucketStart" >= ${wauStart}
                        ) AS wau,
                        COUNT(DISTINCT "distinctId") FILTER (
                            WHERE "bucketStart" >= ${mauStart}
                        ) AS mau
                    FROM "TenantUserActivityDaily"
                    WHERE
                        "tenantId" = ${tenantId}
                        AND "bucketStart" >= ${mauStart}
                        AND "bucketStart" < ${selectedEnd}
                `),
            ]);

            const counts = activeUserCounts[0] ?? {
                dau: BigInt(0),
                wau: BigInt(0),
                mau: BigInt(0),
            };

            return [
                ["Metric", "Value"],
                ["Total Events", String(totalEvents._sum.eventCount ?? 0)],
                ["DAU", String(counts.dau)],
                ["WAU", String(counts.wau)],
                ["MAU", String(counts.mau)],
            ];
        });

        for (const row of data) {
            yield row;
        }

        return;
    }

    // TOP EVENTS EXPORT
    if (view === "top-events") {
        const data = await withTenant(userId, tenantId, async (tx) => {
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

            return [
                ["Event Name", "Event Count"],
                ...grouped.map((event) => [
                    event.eventName,
                    String(event._sum.eventCount ?? 0),
                ]),
            ];
        });

        for (const row of data) {
            yield row;
        }

        return;
    }

    // FUNNEL EXPORT
    if (view === "funnel") {
        const requestedSteps = steps!;

        const data = await withTenant(userId, tenantId, async (tx) => {
            const requestedStepValues = Prisma.join(
                requestedSteps.map((eventName, index) =>
                    Prisma.sql`(${index + 1}::int, ${eventName}::text)`
                )
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
                `
            );

            const counts = funnelRows.map((row) =>
                Number(row.reachedUsers)
            );

            const totalUsers = counts[0] ?? 0;

            const rows: CsvRow[] = [
                [
                    "Step",
                    "Event Name",
                    "Reached Users",
                    "Conversion Rate (%)",
                    "Drop-off",
                ],
            ];

            requestedSteps.forEach((eventName, index) => {
                const reachedUsers = counts[index] ?? 0;

                const previousCount =
                    index === 0 ? totalUsers : counts[index - 1] ?? 0;

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

            return rows;
        });

        for (const row of data) {
            yield row;
        }

        return;
    }

    // RETENTION EXPORT
    if (view === "retention") {
        yield [
            "Cohort Week",
            "Cohort Size",
            "Week Number",
            "Active Users",
            "Retention Rate (%)",
        ];

        let offset = 0;

        while (true) {
            const batch = await withTenant(userId, tenantId, async (tx) => {
                return tx.$queryRaw<RetentionRow[]>(Prisma.sql`
                    WITH first_signup AS (
                        SELECT
                            e."distinctId",
                            MIN(e."occurredAt") AS "signupAt"
                        FROM "Event" e
                        WHERE
                            e."tenantId" = ${tenantId}
                            AND e."eventName" = 'Sign Up'
                            AND e."occurredAt" >= ${selectedStart}
                            AND e."occurredAt" < ${selectedEnd}
                        GROUP BY e."distinctId"
                    ),

                    cohort_users AS (
                        SELECT
                            fs."distinctId",
                            fs."signupAt",
                            DATE_TRUNC(
                                'week',
                                fs."signupAt" AT TIME ZONE 'UTC'
                            ) AS "cohortWeek"
                        FROM first_signup fs
                    ),

                    cohort_sizes AS (
                        SELECT
                            cu."cohortWeek",
                            COUNT(*)::bigint AS "cohortSize"
                        FROM cohort_users cu
                        GROUP BY cu."cohortWeek"
                    ),

                    weekly_activity AS (
                        SELECT
                            cu."cohortWeek",
                            FLOOR(
                                EXTRACT(
                                    EPOCH FROM (
                                        DATE_TRUNC(
                                            'week',
                                            e."occurredAt" AT TIME ZONE 'UTC'
                                        ) - cu."cohortWeek"
                                    )
                                ) / 604800
                            )::int AS "weekNumber",
                            COUNT(DISTINCT cu."distinctId")::bigint AS "activeUsers"
                        FROM cohort_users cu
                        JOIN "Event" e
                            ON e."tenantId" = ${tenantId}
                            AND e."distinctId" = cu."distinctId"
                            AND e."occurredAt" >= cu."signupAt"
                            AND e."occurredAt" < ${selectedEnd}
                        GROUP BY
                            cu."cohortWeek",
                            "weekNumber"
                    )

                    SELECT
                        TO_CHAR(cs."cohortWeek", 'YYYY-MM-DD') AS "cohortWeek",
                        cs."cohortSize",
                        weeks.week_number AS "weekNumber",
                        COALESCE(wa."activeUsers", 0)::bigint AS "activeUsers"
                    FROM cohort_sizes cs
                    CROSS JOIN generate_series(0, 11) AS weeks(week_number)
                    LEFT JOIN weekly_activity wa
                        ON wa."cohortWeek" = cs."cohortWeek"
                        AND wa."weekNumber" = weeks.week_number
                    ORDER BY
                        cs."cohortWeek",
                        weeks.week_number
                    LIMIT ${BATCH_SIZE}
                    OFFSET ${offset}
                `);
            });

            if (batch.length === 0) {
                break;
            }

            for (const row of batch) {
                const cohortSize = Number(row.cohortSize);
                const activeUsers = Number(row.activeUsers);

                yield [
                    row.cohortWeek,
                    String(cohortSize),
                    String(row.weekNumber),
                    String(activeUsers),
                    cohortSize > 0
                        ? ((activeUsers / cohortSize) * 100).toFixed(2)
                        : "0.00",
                ];
            }

            offset += batch.length;

            if (batch.length < BATCH_SIZE) {
                break;
            }
        }
    }
}

const createCsvStream = (rows: AsyncGenerator<CsvRow>) => {
    const encoder = new TextEncoder();

    return new ReadableStream<Uint8Array>({
        async pull(controller) {
            try {
                const result = await rows.next();

                if (result.done) {
                    controller.close();
                    return;
                }

                controller.enqueue(
                    encoder.encode(createCsvRow(result.value)),
                );
            } catch (error) {
                controller.error(error);
            }
        },

        async cancel() {
            await rows.return(undefined);
        },
    });
};

export const GET = async (request: Request) => {
    const { requestId, log } = createRequestLogger(request);

    const respond = (body: object, status: number) =>
        Response.json(body, {
            status,
            headers: {
                "X-Request-Id": requestId,
                "Cache-Control": "no-store",
            },
        });

    log("info", "analytics_export_started");

    try {
        const session = await auth();
        const userId = session?.user?.id;
        const tenantId = session?.user?.activeTenantId;

        if (!userId || !tenantId) {
            log("warn", "analytics_export_unauthorized");
            return respond({ error: "Unauthorized." }, 401);
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
            log("warn", "analytics_export_invalid_parameters");
            return respond(
                { error: "Invalid export parameters." },
                400,
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
            (!steps ||
                steps.length < 2 ||
                steps.length > 6 ||
                new Set(steps).size !== steps.length)
        ) {
            log("warn", "analytics_export_invalid_funnel_steps", {
                stepCount: steps?.length ?? 0,
            });

            return respond(
                { error: "Funnel requires 2 to 6 unique steps." },
                400,
            );
        }

        const range = getDateRange(startDate, endDate);
        const selectedStart = range.startDate;
        const selectedEnd = range.endDate;

        const startLabel = selectedStart.toISOString().slice(0, 10);
        const endLabel = new Date(
            selectedEnd.getTime() - 86400000,
        ).toISOString().slice(0, 10);

        const csvRows = generateCsvRows({
            userId,
            tenantId,
            view,
            selectedStart,
            selectedEnd,
            steps,
            conversionWindowDays,
        });

        const filename = `atlas-${view}-${startLabel}-${endLabel}.csv`;

        log("info", "analytics_export_stream_started", {
            view,
            tenantId,
            startDate: startLabel,
            endDate: endLabel,
        });

        return new Response(createCsvStream(csvRows), {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
                "X-Request-Id": requestId,
            },
        });
    } catch (error) {
        log("error", "analytics_export_failed", {
            error: error instanceof Error ? error.message : String(error),
        });

        return respond(
            { error: "Unable to export analytics." },
            500,
        );
    }
};


import { auth } from "@/auth";
import { withTenant } from "@/lib/tenant-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = async (request: Request) => {
    const session = await auth();

    const userId = session?.user?.id;
    const tenantId = session?.user?.activeTenantId;

    if (!userId || !tenantId) {
        return new Response("Unauthorized", { status: 401 });
    }

    const encoder = new TextEncoder();

    let closed = false;
    let polling = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    let lastCheckedAt = new Date();

    const stream = new ReadableStream({
        start(controller) {
            const send = (message: string) => {
                if (closed) return;

                try {
                    controller.enqueue(encoder.encode(message));
                } catch {
                    closed = true;
                    if (interval) clearInterval(interval);
                }
            };

            const poll = async () => {
                if (closed || polling) return;

                polling = true;

                const pollTime = new Date();

                try {
                    const result = await withTenant(
                        userId,
                        tenantId,
                        async (tx) => {
                            return tx.$queryRaw<
                                {
                                    eventCount: bigint;
                                    latestEventAt: Date | null;
                                    eventNames: string[] | null;
                                }[]
                            >`
                                SELECT
                                    COUNT(*)::bigint AS "eventCount",
                                    MAX("receivedAt") AS "latestEventAt",
                                    ARRAY_AGG(DISTINCT "eventName") AS "eventNames"
                                FROM "Event"
                                WHERE "tenantId" = ${tenantId}
                                  AND "receivedAt" > ${lastCheckedAt}
                                  AND "receivedAt" <= ${pollTime}
                            `;
                        },
                    );

                    lastCheckedAt = pollTime;

                    const row = result[0];

                    if (row && row.eventCount > BigInt(0)) {
                        send(
                            `data: ${JSON.stringify({
                                eventCount: Number(row.eventCount),
                                latestEventAt: row.latestEventAt,
                                eventNames: row.eventNames ?? [],
                            })}\n\n`,
                        );
                    } else {
                        send(": keep-alive\n\n");
                    }
                } catch (error) {
                    console.error("Live analytics polling failed:", error);
                    send(": keep-alive\n\n");
                } finally {
                    polling = false;
                }
            };

            send("retry: 5000\n\n");

            void poll();

            interval = setInterval(() => {
                void poll();
            }, 5000);

            request.signal.addEventListener(
                "abort",
                () => {
                    closed = true;

                    if (interval) {
                        clearInterval(interval);
                    }

                    try {
                        controller.close();
                    } catch {
                        // Stream may already be closed.
                    }
                },
                { once: true },
            );
        },

        cancel() {
            closed = true;

            if (interval) {
                clearInterval(interval);
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
};

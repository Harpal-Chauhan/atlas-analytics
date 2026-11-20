
import { auth } from "@/auth";
import { subscribeToTenantEvents } from "@/lib/postgres-listener";
import { withTenant } from "@/lib/tenant-db";
import { createRequestLogger } from "@/lib/request-logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = async (request: Request) => {
    const { requestId, log } = createRequestLogger(request);

    log("info", "live_analytics_connection_requested");

    let session;

    try {
        session = await auth();
    } catch (error) {
        log("error", "live_analytics_auth_failed", {
            error: error instanceof Error
                ? error.message
                : String(error),
        });

        return new Response("Authentication failed", {
            status: 500,
            headers: {
                "X-Request-Id": requestId,
                "Cache-Control": "no-store",
            },
        });
    }

    const userId = session?.user?.id;
    const tenantId = session?.user?.activeTenantId;

    if (!userId || !tenantId) {
        log("warn", "live_analytics_unauthorized");

        return new Response("Unauthorized", {
            status: 401,
            headers: {
                "X-Request-Id": requestId,
                "Cache-Control": "no-store",
            },
        });
    }

    // Verify that the user still belongs to the active tenant.
    try {
        await withTenant(userId, tenantId, async () => true);
    } catch (error) {
        log("warn", "live_analytics_tenant_access_denied", {
            tenantId,
            error: error instanceof Error
                ? error.message
                : String(error),
        });

        return new Response("Forbidden", {
            status: 403,
            headers: {
                "X-Request-Id": requestId,
                "Cache-Control": "no-store",
            },
        });
    }

    const encoder = new TextEncoder();

    let closed = false;
    let unsubscribe: (() => void) | null = null;
    let heartbeat: ReturnType<typeof setInterval> | undefined;

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            const cleanup = () => {
                if (closed) return;

                closed = true;

                if (heartbeat) {
                    clearInterval(heartbeat);
                    heartbeat = undefined;
                }

                unsubscribe?.();
                unsubscribe = null;

                request.signal.removeEventListener("abort", cleanup);

                try {
                    controller.close();
                } catch {
                    // Stream may already be closed.
                }

                log("info", "live_analytics_connection_closed", {
                    tenantId,
                });
            };

            const send = (message: string) => {
                if (closed) return;

                try {
                    controller.enqueue(encoder.encode(message));
                } catch (error) {
                    log("warn", "live_analytics_stream_write_failed", {
                        error: error instanceof Error
                            ? error.message
                            : String(error),
                    });

                    cleanup();
                }
            };

            request.signal.addEventListener("abort", cleanup, {
                once: true,
            });

            if (request.signal.aborted) {
                cleanup();
                return;
            }

            try {
                unsubscribe = await subscribeToTenantEvents(
                    tenantId,
                    (event) => {
                        send(
                            `data: ${JSON.stringify({
                                eventCount: event.eventCount,
                                latestEventAt: event.latestEventAt,
                                eventNames: event.eventNames,
                            })}\n\n`,
                        );
                    },
                );

                if (closed) {
                    unsubscribe();
                    unsubscribe = null;
                    return;
                }

                log("info", "live_analytics_subscription_started", {
                    tenantId,
                });

                send("retry: 5000\n\n");
                send(": connected\n\n");

                // Keep the SSE connection alive without querying the database.
                heartbeat = setInterval(() => {
                    send(": keep-alive\n\n");
                }, 25000);
            } catch (error) {
                log("error", "live_analytics_subscription_failed", {
                    tenantId,
                    error: error instanceof Error
                        ? error.message
                        : String(error),
                });

                if (!closed) {
                    send(
                        `event: error\ndata: ${JSON.stringify({
                            message: "Live analytics is temporarily unavailable.",
                        })}\n\n`,
                    );
                }

                cleanup();
            }
        },

        cancel() {
            if (closed) return;

            closed = true;

            if (heartbeat) {
                clearInterval(heartbeat);
                heartbeat = undefined;
            }

            unsubscribe?.();
            unsubscribe = null;

            request.signal.removeEventListener("abort", () => { });

            log("info", "live_analytics_stream_cancelled", {
                tenantId,
            });
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
            "X-Request-Id": requestId,
        },
    });
};

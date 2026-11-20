
import { randomUUID } from "node:crypto";

type LogLevel = "info" | "warn" | "error";
type LogFields = Record<string, unknown>;

export const createRequestLogger = (request: Request) => {
    const incomingRequestId = request.headers.get("x-request-id");

    const requestId =
        incomingRequestId &&
            /^[a-zA-Z0-9._-]{1,128}$/.test(incomingRequestId)
            ? incomingRequestId
            : randomUUID();

    const log = (
        level: LogLevel,
        event: string,
        fields: LogFields = {},
    ) => {
        const entry = {
            ...fields,
            timestamp: new Date().toISOString(),
            level,
            event,
            requestId,
        };

        const message = JSON.stringify(entry);

        if (level === "error") {
            console.error(message);
        } else if (level === "warn") {
            console.warn(message);
        } else {
            console.info(message);
        }
    };

    return { requestId, log };
};

type RouteHandler<Args extends [Request, ...unknown[]]> = (
    ...args: Args
) => Promise<Response>;

export const withRequestLogging = <
    Args extends [Request, ...unknown[]]
>(
    handler: RouteHandler<Args>,
): RouteHandler<Args> => {
    return async (...args: Args): Promise<Response> => {
        const request = args[0];
        const { requestId, log } = createRequestLogger(request);

        const startedAt = Date.now();
        const path = new URL(request.url).pathname;

        log("info", "request_started", {
            method: request.method,
            path,
        });

        try {
            const response = await handler(...args);

            const headers = new Headers(response.headers);
            headers.set("X-Request-Id", requestId);

            const loggedResponse = new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers,
            });

            const durationMs = Date.now() - startedAt;

            log(
                response.status >= 500
                    ? "error"
                    : response.status >= 400
                        ? "warn"
                        : "info",
                "request_completed",
                {
                    method: request.method,
                    path,
                    status: response.status,
                    durationMs,
                },
            );

            return loggedResponse;
        } catch (error) {
            const durationMs = Date.now() - startedAt;

            log("error", "request_failed", {
                method: request.method,
                path,
                durationMs,
                error:
                    error instanceof Error
                        ? error.message
                        : String(error),
            });

            return Response.json(
                {
                    error: "Internal server error",
                    requestId,
                },
                {
                    status: 500,
                    headers: {
                        "X-Request-Id": requestId,
                        "Cache-Control": "no-store",
                    },
                },
            );
        }
    };
};

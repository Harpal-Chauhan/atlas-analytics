
import { randomUUID } from "node:crypto";

type LogLevel = "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

export const createRequestLogger = (request: Request) => {
    const incomingRequestId = request.headers.get("x-request-id");

    const requestId =
        incomingRequestId && /^[a-zA-Z0-9._-]{1,128}$/.test(incomingRequestId)
            ? incomingRequestId
            : randomUUID();

    const log = (
        level: LogLevel,
        event: string,
        fields: LogFields = {},
    ) => {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            event,
            ...fields,
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

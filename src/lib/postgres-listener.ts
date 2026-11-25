
import { Client } from "pg";

type LiveEventNotification = {
    tenantId: string;
    eventCount: number;
    latestEventAt: string;
    eventNames: string[];
};

type ListenerState = {
    client: Client | null;
    connected: boolean;
    connecting: Promise<void> | null;
    reconnectTimer: ReturnType<typeof setTimeout> | null;
    subscribers: Map<
        string,
        Set<(event: LiveEventNotification) => void>
    >;
};

declare global {
    var atlasPostgresEventListener: ListenerState | undefined;
}

const getState = (): ListenerState => {
    globalThis.atlasPostgresEventListener ??= {
        client: null,
        connected: false,
        connecting: null,
        reconnectTimer: null,
        subscribers: new Map(),
    };

    return globalThis.atlasPostgresEventListener;
};

const isLiveEventNotification = (
    value: unknown,
): value is LiveEventNotification => {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const event = value as Record<string, unknown>;

    return (
        typeof event.tenantId === "string" &&
        typeof event.eventCount === "number" &&
        typeof event.latestEventAt === "string" &&
        Array.isArray(event.eventNames) &&
        event.eventNames.every(
            (name: unknown) => typeof name === "string",
        )
    );
};

const scheduleReconnect = (): void => {
    const state = getState();

    if (
        state.subscribers.size === 0 ||
        state.reconnectTimer
    ) {
        return;
    }

    state.reconnectTimer = setTimeout(() => {
        state.reconnectTimer = null;

        void connectListener().catch(() => {
            // A later reconnect attempt will retry.
        });
    }, 5000);

    state.reconnectTimer.unref();
};

const connectListener = async (): Promise<void> => {
    const state = getState();

    if (state.connected) return;

    if (state.connecting) {
        return state.connecting;
    }

    const connectionString = process.env.APP_LISTENER_DATABASE_URL;

    if (!connectionString) {
        throw new Error("APP_LISTENER_DATABASE_URL is not configured.");
    }

    const client = new Client({
        connectionString,
        application_name: "atlas-live-listener",
    });

    state.client = client;

    client.on("notification", (message) => {
        console.log("[LIVE] PostgreSQL notification received:", {
            channel: message.channel,
            hasPayload: Boolean(message.payload),
        });
        if (
            message.channel !== "atlas_events" ||
            !message.payload
        ) {
            return;
        }

        try {
            const payload: unknown = JSON.parse(message.payload);

            if (!isLiveEventNotification(payload)) return;

            const listeners = state.subscribers.get(payload.tenantId);

            listeners?.forEach((listener) => {
                listener(payload);
            });
        } catch (error) {
            console.error("Invalid live event notification:", error);
        }
    });

    client.on("error", (error) => {
        console.error("[LIVE] PostgreSQL listener error:", error.message);
        if (state.client !== client) return;

        state.client = null;
        state.connected = false;

        scheduleReconnect();
    });

    client.on("end", () => {
        if (state.client !== client) return;

        state.client = null;
        state.connected = false;

        scheduleReconnect();
    });

    state.connecting = (async () => {
        try {
            await client.connect();
            await client.query("LISTEN atlas_events");

            console.log("[LIVE] Listening on atlas_events");

            state.connected = true;
        } catch (error) {
            if (state.client === client) {
                state.client = null;
                state.connected = false;
            }

            await client.end().catch(() => undefined);

            scheduleReconnect();

            throw error;
        } finally {
            state.connecting = null;
        }
    })();

    return state.connecting;
};

export const subscribeToTenantEvents = async (
    tenantId: string,
    callback: (event: LiveEventNotification) => void,
): Promise<(() => void)> => {
    const state = getState();

    const listeners =
        state.subscribers.get(tenantId) ?? new Set();

    listeners.add(callback);
    state.subscribers.set(tenantId, listeners);

    try {
        await connectListener();
    } catch (error) {
        listeners.delete(callback);

        if (listeners.size === 0) {
            state.subscribers.delete(tenantId);
        }

        throw error;
    }

    return () => {
        const currentListeners = state.subscribers.get(tenantId);

        currentListeners?.delete(callback);

        if (currentListeners?.size === 0) {
            state.subscribers.delete(tenantId);
        }
    };
};

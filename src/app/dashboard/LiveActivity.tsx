"use client";

import { useEffect, useState } from "react";

type LiveEventData = {
  eventCount: number;
  latestEventAt: string | null;
  eventNames: string[];
};

const LiveActivity = () => {
  const [status, setStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");

  const [totalEvents, setTotalEvents] = useState(0);
  const [eventNames, setEventNames] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const eventSource = new EventSource("/api/analytics/live");

    eventSource.onopen = () => {
      setStatus("connected");
    };

    eventSource.onmessage = (event) => {
      try {
        const data: LiveEventData = JSON.parse(event.data);

        setTotalEvents((previous) => previous + data.eventCount);

        setEventNames((previous) => [
          ...new Set([...previous, ...data.eventNames]),
        ]);

        setLastUpdated(data.latestEventAt);
      } catch (error) {
        console.error("Invalid live event data:", error);
      }
    };

    eventSource.onerror = () => {
      setStatus("disconnected");
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Live Activity</h2>
          <p className="mt-1 text-sm text-gray-500">
            Real-time incoming events
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              status === "connected"
                ? "bg-green-500"
                : status === "connecting"
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
          />

          <span className="capitalize text-gray-600">{status}</span>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm text-gray-500">
          Events received during this connection
        </p>

        <p className="mt-1 text-3xl font-semibold text-gray-900">
          {totalEvents.toLocaleString()}
        </p>
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-gray-700">
          Event types received
        </p>

        {eventNames.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {eventNames.map((name) => (
              <span
                key={name}
                className="rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-700"
              >
                {name}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">
            Waiting for new events...
          </p>
        )}
      </div>

      {lastUpdated && (
        <p className="mt-4 text-xs text-gray-500">
          Last event: {new Date(lastUpdated).toLocaleString()}
        </p>
      )}
    </section>
  );
};

export default LiveActivity;

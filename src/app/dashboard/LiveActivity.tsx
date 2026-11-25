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

  const statusConfig = {
    connected: {
      label: "Connected",
      dot: "bg-[#20B58A]",
      badge: "border-[#B9DDC8] bg-[#EAF3E9] text-[#176C52]",
      description: "Receiving live events",
    },
    connecting: {
      label: "Connecting",
      dot: "bg-[#D6A63B]",
      badge: "border-[#F0D9A8] bg-[#FFF9E9] text-[#8A6425]",
      description: "Establishing live connection",
    },
    disconnected: {
      label: "Disconnected",
      dot: "bg-[#FF896D]",
      badge: "border-[#F3C8BC] bg-[#FFF1EC] text-[#B85D46]",
      description: "Connection interrupted",
    },
  };

  const currentStatus = statusConfig[status];

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-[#DCE8DD] bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-[#DCE8DD] bg-[#F8FAF4] px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF3E9] text-[#176C52]">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 12h4l3-9 6 18 3-9h4" />
            </svg>
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-bold text-[#142B27] sm:text-lg">
              Live Activity
            </h2>
            <p className="mt-1 text-xs text-[#718078] sm:text-sm">
              Real-time incoming events
            </p>
          </div>
        </div>

        <div
          className={`flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${currentStatus.badge}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${currentStatus.dot} ${
              status === "connected" ? "animate-pulse" : ""
            }`}
          />
          {currentStatus.label}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {/* Event counter */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#DCE8DD] bg-[#F8FAF4] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-[#718078] sm:text-sm">
                Events Received
              </p>

              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF3E9] text-[#176C52]">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12h4l3-8 4 16 3-8h4" />
                </svg>
              </span>
            </div>

            <p className="mt-3 text-3xl font-bold tracking-tight text-[#142B27] sm:text-4xl">
              {totalEvents.toLocaleString()}
            </p>

            <p className="mt-2 text-xs text-[#829087]">
              During this connection
            </p>
          </div>

          <div className="rounded-xl border border-[#DCE8DD] bg-[#F8FAF4] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-[#718078] sm:text-sm">
                Connection Status
              </p>

              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF3E9] text-[#176C52]">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2v4" />
                  <path d="M12 18v4" />
                  <path d="m4.93 4.93 2.83 2.83" />
                  <path d="m16.24 16.24 2.83 2.83" />
                  <path d="M2 12h4" />
                  <path d="M18 12h4" />
                  <path d="m4.93 19.07 2.83-2.83" />
                  <path d="m16.24 7.76 2.83-2.83" />
                </svg>
              </span>
            </div>

            <p className="mt-3 text-xl font-bold text-[#142B27] sm:text-2xl">
              {currentStatus.label}
            </p>

            <p className="mt-2 text-xs text-[#829087]">
              {currentStatus.description}
            </p>
          </div>
        </div>

        {/* Event types */}
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-[#142B27]">
              Event Types Received
            </h3>

            <span className="rounded-full bg-[#EAF3E9] px-2.5 py-1 text-xs font-semibold text-[#176C52]">
              {eventNames.length} Types
            </span>
          </div>

          {eventNames.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {eventNames.map((name) => (
                <span
                  key={name}
                  className="max-w-full break-all rounded-lg border border-[#DCE8DD] bg-[#F8FAF4] px-3 py-2 text-xs font-medium text-[#176C52] sm:text-sm"
                >
                  <span className="mr-2 text-[#20B58A]">●</span>
                  {name}
                </span>
              ))}
            </div>
          ) : (
            <div className="mt-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-[#DCE8DD] bg-[#F8FAF4] px-4 py-8 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EAF3E9] text-[#176C52]">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2v20" />
                  <path d="M2 12h20" />
                </svg>
              </div>

              <p className="mt-3 text-sm font-semibold text-[#142B27]">
                Waiting for new events
              </p>

              <p className="mt-1 text-xs text-[#829087]">
                New event types will appear here when received.
              </p>
            </div>
          )}
        </div>

        {/* Last event */}
        <div className="mt-5 flex flex-col gap-2 border-t border-[#DCE8DD] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#829087]">
            {lastUpdated
              ? `Last event: ${new Date(lastUpdated).toLocaleString()}`
              : "No events received yet"}
          </p>

          <p className="text-xs font-medium text-[#718078]">
            Live event stream
          </p>
        </div>
      </div>
    </section>
  );
};

export default LiveActivity;

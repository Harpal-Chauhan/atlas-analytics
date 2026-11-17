"use client";

import { useEffect, useState } from "react";
import { CsvExportButton } from "./CsvExportButton";

type FunnelBuilderProps = {
  eventNames: string[];
  startDate: string;
  endDate: string;
};

type FunnelStepResult = {
  eventName: string;
  reachedUsers: number;
  conversionRate: number;
  dropOff: number;
};

type FunnelResponse = {
  totalUsers: number;
  conversionWindowDays: number;
  steps: FunnelStepResult[];
};

type ApiError = {
  error?: string;
  message?: string;
};

const FunnelBuilder = ({
  eventNames,
  startDate,
  endDate,
}: FunnelBuilderProps) => {
  const [selectedSteps, setSelectedSteps] = useState<string[]>(() =>
    eventNames.slice(0, 2),
  );
  const [conversionWindowDays, setConversionWindowDays] = useState(7);
  const [result, setResult] = useState<FunnelResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSelectedSteps((currentSteps) => {
      const validSteps = currentSteps.filter((step) =>
        eventNames.includes(step),
      );

      if (validSteps.length >= 2) {
        return validSteps.slice(0, 6);
      }

      return eventNames.slice(0, 2);
    });

    setResult(null);
    setError("");
  }, [eventNames, startDate, endDate]);

  const updateStep = (index: number, value: string) => {
    setSelectedSteps((currentSteps) =>
      currentSteps.map((step, stepIndex) =>
        stepIndex === index ? value : step,
      ),
    );

    setResult(null);
    setError("");
  };

  const addStep = () => {
    const availableStep = eventNames.find(
      (eventName) => !selectedSteps.includes(eventName),
    );

    if (!availableStep || selectedSteps.length >= 6) {
      return;
    }

    setSelectedSteps((currentSteps) => [...currentSteps, availableStep]);
    setResult(null);
    setError("");
  };

  const removeStep = (index: number) => {
    if (selectedSteps.length <= 2) {
      return;
    }

    setSelectedSteps((currentSteps) =>
      currentSteps.filter((_, stepIndex) => stepIndex !== index),
    );

    setResult(null);
    setError("");
  };

  const runFunnel = async () => {
    if (selectedSteps.length < 2) {
      setError("Please select at least 2 funnel steps.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const params = new URLSearchParams();

      selectedSteps.forEach((step) => {
        params.append("step", step);
      });

      params.set("startDate", startDate);
      params.set("endDate", endDate);
      params.set("conversionWindowDays", String(conversionWindowDays));

      const response = await fetch(
        `/api/analytics/funnel?${params.toString()}`,
        {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        },
      );

      const data = (await response.json()) as FunnelResponse | ApiError;

      if (!response.ok) {
        const apiError = data as ApiError;
        throw new Error(
          apiError.error ?? apiError.message ?? "Unable to calculate funnel.",
        );
      }

      setResult(data as FunnelResponse);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while running the funnel.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-900">Funnel Analysis</h2>
        <p className="mt-1 text-sm text-gray-500">
          Select 2 to 6 events to understand your user conversion journey.
        </p>
      </div>

      {eventNames.length < 2 ? (
        <p className="text-sm text-gray-500">
          At least two event types are required to build a funnel.
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {selectedSteps.map((step, index) => (
              <div
                key={`${index}-${step}`}
                className="flex flex-wrap items-center gap-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-700">
                  {index + 1}
                </span>

                <select
                  value={step}
                  onChange={(event) => updateStep(index, event.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-gray-500"
                  aria-label={`Funnel step ${index + 1}`}
                >
                  {eventNames
                    .filter(
                      (name) => name === step || !selectedSteps.includes(name),
                    )
                    .map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                </select>

                {selectedSteps.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeStep(index)}
                    className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                    aria-label={`Remove step ${index + 1}`}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <label
                htmlFor="conversion-window"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Conversion window
              </label>

              <select
                id="conversion-window"
                value={conversionWindowDays}
                onChange={(event) =>
                  setConversionWindowDays(Number(event.target.value))
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-gray-500"
              >
                {[1, 3, 7, 14, 30].map((days) => (
                  <option key={days} value={days}>
                    {days} {days === 1 ? "day" : "days"}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addStep}
                disabled={
                  selectedSteps.length >= 6 ||
                  selectedSteps.length >= eventNames.length
                }
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Add Step
              </button>

              {selectedSteps.length >= 2 && selectedSteps.length <= 6 && (
                <CsvExportButton
                  view="funnel"
                  startDate={startDate}
                  endDate={endDate}
                  steps={selectedSteps}
                  conversionWindowDays={conversionWindowDays}
                />
              )}

              <button
                type="button"
                onClick={runFunnel}
                disabled={loading || selectedSteps.length < 2}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Calculating..." : "Run Funnel"}
              </button>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {result && (
            <div className="mt-6 border-t border-gray-200 pt-5">
              <div className="mb-4">
                <p className="text-sm text-gray-500">
                  Users who completed the first step
                </p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {result.totalUsers.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="space-y-3">
                {result.steps.map((item, index) => (
                  <div
                    key={`${index}-${item.eventName}`}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-gray-500">
                          STEP {index + 1}
                        </p>
                        <h3 className="mt-1 font-medium text-gray-900">
                          {item.eventName}
                        </h3>
                      </div>

                      <p className="text-lg font-semibold text-gray-900">
                        {item.reachedUsers.toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500">Conversion</p>
                        <p className="mt-1 font-medium text-gray-800">
                          {item.conversionRate.toFixed(2)}%
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500">Drop-off</p>
                        <p className="mt-1 font-medium text-gray-800">
                          {item.dropOff.toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default FunnelBuilder;

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

  const resetResult = () => {
    setResult(null);
    setError("");
  };

  const updateStep = (index: number, value: string) => {
    setSelectedSteps((currentSteps) =>
      currentSteps.map((step, stepIndex) =>
        stepIndex === index ? value : step,
      ),
    );

    resetResult();
  };

  const addStep = () => {
    const availableStep = eventNames.find(
      (eventName) => !selectedSteps.includes(eventName),
    );

    if (!availableStep || selectedSteps.length >= 6) {
      return;
    }

    setSelectedSteps((currentSteps) => [...currentSteps, availableStep]);

    resetResult();
  };

  const removeStep = (index: number) => {
    if (selectedSteps.length <= 2) {
      return;
    }

    setSelectedSteps((currentSteps) =>
      currentSteps.filter((_, stepIndex) => stepIndex !== index),
    );

    resetResult();
  };

  const runFunnel = async () => {
    if (selectedSteps.length < 2) {
      setError("Please select at least 2 funnel steps.");
      return;
    }

    if (new Set(selectedSteps).size !== selectedSteps.length) {
      setError("Each funnel step must be unique.");
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
    <section className="w-full min-w-0 overflow-hidden rounded-2xl border border-[#DCE8DD] bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-[#DCE8DD] bg-[#F8FAF4] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF3E9] text-[#176C52]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-5 5" />
            </svg>
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-bold text-[#142B27] sm:text-lg">
              Funnel Analysis
            </h2>
            <p className="mt-1 text-xs text-[#718078] sm:text-sm">
              Understand how users move through your conversion journey.
            </p>
          </div>
        </div>

        <span className="w-fit rounded-full border border-[#DCE8DD] bg-white px-3 py-1 text-xs font-semibold text-[#176C52]">
          Conversion Analytics
        </span>
      </div>

      <div className="p-5 sm:p-6">
        {/* No Events */}
        {eventNames.length < 2 ? (
          <div className="rounded-xl border border-dashed border-[#DCE8DD] bg-[#F8FAF4] px-4 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF3E9] text-[#176C52]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="23"
                height="23"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>

            <h3 className="mt-3 text-sm font-bold text-[#142B27]">
              Not Enough Events
            </h3>

            <p className="mx-auto mt-1 max-w-sm text-sm text-[#718078]">
              At least two event types are required to build a funnel.
            </p>
          </div>
        ) : (
          <>
            {/* Funnel Steps */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#142B27]">
                  Conversion Journey
                </h3>
                <p className="mt-1 text-xs text-[#829087]">
                  Select 2 to 6 unique events in the desired order.
                </p>
              </div>

              <span className="w-fit rounded-lg bg-[#EAF3E9] px-3 py-1.5 text-xs font-semibold text-[#176C52]">
                {selectedSteps.length} / 6 Steps
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {selectedSteps.map((step, index) => (
                <div
                  key={`${index}-${step}`}
                  className="flex min-w-0 flex-col gap-3 rounded-xl border border-[#DCE8DD] bg-[#F8FAF4] p-3 transition hover:border-[#A9C7B4] sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-3 sm:w-32 sm:shrink-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#176C52] text-sm font-bold text-white">
                      {index + 1}
                    </span>

                    <span className="text-xs font-bold uppercase tracking-wide text-[#718078]">
                      Step {index + 1}
                    </span>
                  </div>

                  <select
                    value={step}
                    onChange={(event) => updateStep(index, event.target.value)}
                    aria-label={`Funnel step ${index + 1}`}
                    className="h-11 min-w-0 w-full flex-1 rounded-xl border border-[#DCE8DD] bg-white px-3 text-sm font-medium text-[#142B27] outline-none transition focus:border-[#20B58A] focus:ring-4 focus:ring-[#20B58A]/10"
                  >
                    {eventNames
                      .filter(
                        (name) =>
                          name === step || !selectedSteps.includes(name),
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
                      aria-label={`Remove step ${index + 1}`}
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#F2C9BE] bg-white px-3 text-xs font-semibold text-[#B85D46] transition hover:bg-[#FFF1ED] sm:w-auto"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="m19 6-1 14H6L5 6" />
                      </svg>
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Configuration */}
            <div className="mt-6 grid grid-cols-1 gap-4 border-t border-[#DCE8DD] pt-5 sm:grid-cols-2">
              <div className="min-w-0">
                <label
                  htmlFor="conversion-window"
                  className="mb-2 block text-xs font-semibold text-[#718078]"
                >
                  Conversion Window
                </label>

                <select
                  id="conversion-window"
                  value={conversionWindowDays}
                  onChange={(event) => {
                    setConversionWindowDays(Number(event.target.value));
                    resetResult();
                  }}
                  className="h-11 w-full rounded-xl border border-[#DCE8DD] bg-[#F8FAF4] px-3 text-sm font-medium text-[#142B27] outline-none transition focus:border-[#20B58A] focus:ring-4 focus:ring-[#20B58A]/10"
                >
                  {[1, 3, 7, 14, 30].map((days) => (
                    <option key={days} value={days}>
                      {days} {days === 1 ? "day" : "days"}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs text-[#829087]">
                  Maximum time allowed between funnel steps.
                </p>
              </div>

              <div className="flex min-w-0 flex-col justify-end">
                <p className="mb-2 text-xs font-semibold text-[#718078]">
                  Funnel Actions
                </p>

                <button
                  type="button"
                  onClick={addStep}
                  disabled={
                    selectedSteps.length >= 6 ||
                    selectedSteps.length >= eventNames.length
                  }
                  className="h-11 w-full rounded-xl border border-[#DCE8DD] bg-white px-4 text-sm font-semibold text-[#176C52] transition hover:border-[#20B58A] hover:bg-[#EAF3E9] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  + Add Funnel Step
                </button>
              </div>
            </div>

            {/* Main Actions */}
            <div className="mt-5 flex flex-col gap-3 border-t border-[#DCE8DD] pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <CsvExportButton
                view="funnel"
                startDate={startDate}
                endDate={endDate}
                steps={selectedSteps}
                conversionWindowDays={conversionWindowDays}
              />

              <button
                type="button"
                onClick={runFunnel}
                disabled={loading || selectedSteps.length < 2}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#176C52] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#142B27] focus:outline-none focus:ring-4 focus:ring-[#20B58A]/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {loading ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Calculating...
                  </>
                ) : (
                  <>
                    Run Funnel
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-[#F2C9BE] bg-[#FFF1ED] px-4 py-3 text-sm text-[#B85D46]"
              >
                {error}
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="mt-7 border-t border-[#DCE8DD] pt-6">
                <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#DCE8DD] bg-[#F8FAF4] p-4">
                    <p className="text-xs font-semibold text-[#718078]">
                      USERS AT FIRST STEP
                    </p>

                    <p className="mt-2 text-2xl font-bold tracking-tight text-[#142B27]">
                      {result.totalUsers.toLocaleString("en-IN")}
                    </p>

                    <p className="mt-1 text-xs text-[#829087]">
                      Starting funnel audience
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#DCE8DD] bg-[#F8FAF4] p-4">
                    <p className="text-xs font-semibold text-[#718078]">
                      CONVERSION WINDOW
                    </p>

                    <p className="mt-2 text-2xl font-bold tracking-tight text-[#142B27]">
                      {result.conversionWindowDays}
                      <span className="ml-1 text-sm font-medium text-[#718078]">
                        days
                      </span>
                    </p>

                    <p className="mt-1 text-xs text-[#829087]">
                      Allowed conversion period
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="text-base font-bold text-[#142B27]">
                    Funnel Performance
                  </h3>

                  <p className="mt-1 text-xs text-[#829087]">
                    User progression across each selected event.
                  </p>
                </div>

                <div className="space-y-3">
                  {result.steps.map((item, index) => (
                    <div
                      key={`${index}-${item.eventName}`}
                      className="min-w-0 rounded-xl border border-[#DCE8DD] bg-white p-4 transition hover:border-[#A9C7B4] sm:p-5"
                    >
                      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF3E9] text-sm font-bold text-[#176C52]">
                            {index + 1}
                          </span>

                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#829087]">
                              Step {index + 1}
                            </p>

                            <h4 className="mt-1 break-words text-sm font-bold text-[#142B27]">
                              {item.eventName}
                            </h4>
                          </div>
                        </div>

                        <div className="sm:text-right">
                          <p className="text-xl font-bold text-[#142B27]">
                            {item.reachedUsers.toLocaleString("en-IN")}
                          </p>
                          <p className="text-xs text-[#829087]">
                            Reached users
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold text-[#718078]">
                            Conversion Rate
                          </span>

                          <span className="text-sm font-bold text-[#176C52]">
                            {item.conversionRate.toFixed(2)}%
                          </span>
                        </div>

                        <div
                          className="h-2.5 w-full overflow-hidden rounded-full bg-[#EAF3E9]"
                          role="progressbar"
                          aria-label={`${item.eventName} conversion rate`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.max(
                            0,
                            Math.min(item.conversionRate, 100),
                          )}
                        >
                          <div
                            className="h-full rounded-full bg-[#20B58A] transition-all duration-500"
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(item.conversionRate, 100),
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#DCE8DD] pt-3">
                        <span className="text-xs text-[#718078]">Drop-off</span>

                        <span className="text-sm font-semibold text-[#B85D46]">
                          {item.dropOff.toLocaleString("en-IN")} users
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default FunnelBuilder;

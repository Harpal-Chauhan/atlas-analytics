"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const formatDate = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getDateRange = (days: number) => {
  const endDate = new Date();
  const startDate = new Date();

  startDate.setUTCDate(startDate.getUTCDate() - (days - 1));

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
};

const getRangePreset = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return "custom";
  }

  const days = Math.round((end - start) / 86400000) + 1;

  return ["7", "30", "90"].includes(String(days)) ? String(days) : "custom";
};

const DateRangePicker = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const searchParamsString = searchParams.toString();

  const defaultDates = getDateRange(30);

  const initialStartDate =
    searchParams.get("startDate") ?? defaultDates.startDate;

  const initialEndDate = searchParams.get("endDate") ?? defaultDates.endDate;

  const [range, setRange] = useState(() =>
    getRangePreset(initialStartDate, initialEndDate),
  );

  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [error, setError] = useState("");

  const today = formatDate(new Date());

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    const dates = getDateRange(30);

    const nextStartDate = params.get("startDate") ?? dates.startDate;
    const nextEndDate = params.get("endDate") ?? dates.endDate;

    setStartDate(nextStartDate);
    setEndDate(nextEndDate);
    setRange(getRangePreset(nextStartDate, nextEndDate));
    setError("");
  }, [searchParamsString]);

  const updateUrl = (start: string, end: string) => {
    const params = new URLSearchParams(searchParamsString);

    params.set("startDate", start);
    params.set("endDate", end);

    router.push(`${pathname}?${params.toString()}`, {
      scroll: false,
    });
  };

  const handlePresetChange = (value: string) => {
    setRange(value);
    setError("");

    if (value === "custom") {
      return;
    }

    const days = Number(value);
    const dates = getDateRange(days);

    setStartDate(dates.startDate);
    setEndDate(dates.endDate);

    updateUrl(dates.startDate, dates.endDate);
  };

  const handleCustomApply = () => {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates.");
      return;
    }

    if (startDate > endDate) {
      setError("Start date cannot be after end date.");
      return;
    }

    if (endDate > today) {
      setError("End date cannot be in the future.");
      return;
    }

    setError("");
    updateUrl(startDate, endDate);
  };

  return (
    <section className="w-full min-w-0 rounded-2xl border border-[#DCE8DD] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF3E9] text-[#176C52]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4" />
              <path d="M8 2v4" />
              <path d="M3 10h18" />
            </svg>
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[#142B27] sm:text-base">
              Date Range
            </h2>
            <p className="mt-0.5 text-xs text-[#829087]">
              Filter analytics by date
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="w-full min-w-0 sm:w-auto sm:min-w-[180px]">
            <label
              htmlFor="date-range"
              className="mb-2 block text-xs font-semibold text-[#718078]"
            >
              Select Period
            </label>

            <select
              id="date-range"
              value={range}
              onChange={(event) => handlePresetChange(event.target.value)}
              className="h-11 w-full rounded-xl border border-[#DCE8DD] bg-[#F8FAF4] px-3 text-sm font-medium text-[#142B27] outline-none transition hover:border-[#A9C7B4] focus:border-[#20B58A] focus:ring-4 focus:ring-[#20B58A]/10 sm:w-auto sm:min-w-[180px]"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {range === "custom" && (
            <>
              <div className="min-w-0 flex-1 sm:min-w-[145px]">
                <label
                  htmlFor="start-date"
                  className="mb-2 block text-xs font-semibold text-[#718078]"
                >
                  Start Date
                </label>

                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  max={endDate && endDate < today ? endDate : today}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    setError("");
                  }}
                  className="h-11 w-full min-w-0 rounded-xl border border-[#DCE8DD] bg-[#F8FAF4] px-3 text-sm text-[#142B27] outline-none transition focus:border-[#20B58A] focus:ring-4 focus:ring-[#20B58A]/10"
                />
              </div>

              <div className="min-w-0 flex-1 sm:min-w-[145px]">
                <label
                  htmlFor="end-date"
                  className="mb-2 block text-xs font-semibold text-[#718078]"
                >
                  End Date
                </label>

                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  min={startDate}
                  max={today}
                  onChange={(event) => {
                    setEndDate(event.target.value);
                    setError("");
                  }}
                  className="h-11 w-full min-w-0 rounded-xl border border-[#DCE8DD] bg-[#F8FAF4] px-3 text-sm text-[#142B27] outline-none transition focus:border-[#20B58A] focus:ring-4 focus:ring-[#20B58A]/10"
                />
              </div>

              <button
                type="button"
                onClick={handleCustomApply}
                disabled={
                  !startDate ||
                  !endDate ||
                  startDate > endDate ||
                  endDate > today
                }
                className="h-11 w-full rounded-xl bg-[#176C52] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#142B27] focus:outline-none focus:ring-4 focus:ring-[#20B58A]/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                Apply Filter
              </button>
            </>
          )}
        </div>
      </div>

      {range === "custom" && error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-[#F2C9BE] bg-[#FFF1ED] px-4 py-2.5 text-xs font-medium text-[#B85D46]"
        >
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#DCE8DD] pt-4">
        <span className="text-xs font-medium text-[#829087]">
          Current selection:
        </span>

        <span className="rounded-full border border-[#DCE8DD] bg-[#EAF3E9] px-3 py-1 text-xs font-semibold text-[#176C52]">
          {startDate} — {endDate}
        </span>
      </div>
    </section>
  );
};

export default DateRangePicker;

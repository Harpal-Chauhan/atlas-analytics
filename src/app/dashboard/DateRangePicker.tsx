"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getDateRange = (days: number) => {
  const endDate = new Date();
  const startDate = new Date();

  startDate.setDate(startDate.getDate() - (days - 1));

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
};

const getRangePreset = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();

  const days = Math.round((end - start) / 86400000) + 1;

  return ["7", "30", "90"].includes(String(days)) ? String(days) : "custom";
};

const DateRangePicker = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const searchParamsString = searchParams.toString();

  const initialStartDate =
    searchParams.get("startDate") ?? getDateRange(30).startDate;

  const initialEndDate =
    searchParams.get("endDate") ?? getDateRange(30).endDate;

  const [range, setRange] = useState(() =>
    getRangePreset(initialStartDate, initialEndDate),
  );

  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);

    const nextStartDate = params.get("startDate") ?? getDateRange(30).startDate;

    const nextEndDate = params.get("endDate") ?? getDateRange(30).endDate;

    setStartDate(nextStartDate);
    setEndDate(nextEndDate);
    setRange(getRangePreset(nextStartDate, nextEndDate));
  }, [searchParamsString]);

  const updateUrl = (start: string, end: string) => {
    const params = new URLSearchParams(searchParamsString);

    params.set("startDate", start);
    params.set("endDate", end);

    router.replace(`${pathname}?${params.toString()}`);
  };

  const handlePresetChange = (value: string) => {
    setRange(value);

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
    if (!startDate || !endDate || startDate > endDate) {
      return;
    }

    updateUrl(startDate, endDate);
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
      <div>
        <label
          htmlFor="date-range"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Date Range
        </label>

        <select
          id="date-range"
          value={range}
          onChange={(event) => handlePresetChange(event.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
        >
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      {range === "custom" && (
        <>
          <div>
            <label
              htmlFor="start-date"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Start Date
            </label>

            <input
              id="start-date"
              type="date"
              value={startDate}
              max={endDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="end-date"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              End Date
            </label>

            <input
              id="end-date"
              type="date"
              value={endDate}
              min={startDate}
              max={formatDate(new Date())}
              onChange={(event) => setEndDate(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={handleCustomApply}
            disabled={!startDate || !endDate || startDate > endDate}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply
          </button>
        </>
      )}
    </div>
  );
};

export default DateRangePicker;
"use client";

import { useEffect, useState } from "react";
import { CsvExportButton } from "./CsvExportButton";

type RetentionWeek = {
  weekNumber: number;
  activeUsers: number;
  retentionRate: number;
};

type RetentionCohort = {
  cohortWeek: string;
  cohortSize: number;
  weeks: RetentionWeek[];
};

type RetentionHeatmapProps = {
  startDate: string;
  endDate: string;
};

const RetentionHeatmap = ({ startDate, endDate }: RetentionHeatmapProps) => {
  const [cohorts, setCohorts] = useState<RetentionCohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadRetention = async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          startDate,
          endDate,
        });

        const response = await fetch(
          `/api/analytics/retention?${params.toString()}`,
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load retention data.");
        }

        setCohorts(data.cohorts);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Something went wrong.",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadRetention();
  }, [startDate, endDate]);

  const getRetention = (cohort: RetentionCohort, weekNumber: number) => {
    return cohort.weeks.find((week) => week.weekNumber === weekNumber);
  };

  const formatDate = (value: string) => {
    return new Date(`${value}T00:00:00.000Z`).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Weekly Retention</h3>
          <p className="mt-1 text-sm text-gray-500">
            Percentage of users returning in each week after their first active
            week.
          </p>
        </div>

        <CsvExportButton
          view="retention"
          startDate={startDate}
          endDate={endDate}
        />
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-gray-500">Loading retention data...</p>
      ) : error ? (
        <p className="mt-6 text-sm text-red-600">{error}</p>
      ) : cohorts.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          No retention cohort data available for this date range.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-3 py-3 font-medium">Cohort Week</th>
                <th className="px-3 py-3 text-right font-medium">Users</th>

                {Array.from({ length: 12 }, (_, index) => (
                  <th key={index} className="px-3 py-3 text-center font-medium">
                    Week {index}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {cohorts.map((cohort) => (
                <tr
                  key={cohort.cohortWeek}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="whitespace-nowrap px-3 py-3">
                    {formatDate(cohort.cohortWeek)}
                  </td>

                  <td className="px-3 py-3 text-right font-medium">
                    {cohort.cohortSize.toLocaleString("en-IN")}
                  </td>

                  {Array.from({ length: 12 }, (_, index) => {
                    const week = getRetention(cohort, index);

                    const weekStart = new Date(
                      `${cohort.cohortWeek}T00:00:00.000Z`,
                    );

                    weekStart.setUTCDate(weekStart.getUTCDate() + index * 7);

                    const isAvailable =
                      weekStart <= new Date(`${endDate}T00:00:00.000Z`);

                    const rate = week?.retentionRate ?? 0;

                    return (
                      <td key={index} className="px-2 py-3 text-center">
                        {isAvailable ? (
                          <span
                            title={`${week?.activeUsers ?? 0} active users`}
                            className="inline-flex min-w-12 justify-center rounded-md px-2 py-2 font-medium"
                            style={{
                              backgroundColor:
                                rate >= 75
                                  ? "#d1fae5"
                                  : rate >= 50
                                    ? "#a7f3d0"
                                    : rate >= 25
                                      ? "#dbeafe"
                                      : "#f3f4f6",
                              color: "#1f2937",
                            }}
                          >
                            {rate.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default RetentionHeatmap;

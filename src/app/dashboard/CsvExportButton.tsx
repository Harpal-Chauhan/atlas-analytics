"use client";

type CsvExportButtonProps = {
  view: "overview" | "top-events" | "funnel" | "retention";
  startDate?: string;
  endDate?: string;
  steps?: string[];
  conversionWindowDays?: number;
};

export const CsvExportButton = ({
  view,
  startDate,
  endDate,
  steps,
  conversionWindowDays = 7,
}: CsvExportButtonProps) => {
  const handleExport = () => {
    const params = new URLSearchParams();

    params.set("view", view);

    if (startDate) {
      params.set("startDate", startDate);
    }

    if (endDate) {
      params.set("endDate", endDate);
    }

    if (steps) {
      steps.forEach((step) => {
        params.append("step", step);
      });
    }

    if (view === "funnel") {
      params.set("conversionWindowDays", String(conversionWindowDays));
    }

    window.location.href = `/api/analytics/export?${params.toString()}`;
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
    >
      Export CSV
    </button>
  );
};

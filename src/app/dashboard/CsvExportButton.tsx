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

    if (steps && steps.length > 0) {
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
      aria-label={`Export ${view} analytics as CSV`}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#DCE8DD] bg-white px-4 py-2.5 text-sm font-semibold text-[#176C52] shadow-sm transition duration-200 hover:border-[#20B58A] hover:bg-[#EAF3E9] hover:text-[#142B27] focus:outline-none focus:ring-4 focus:ring-[#20B58A]/15 active:scale-[0.98] sm:w-auto"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="m7 10 5 5 5-5" />
        <path d="M12 15V3" />
      </svg>

      <span>Export CSV</span>
    </button>
  );
};

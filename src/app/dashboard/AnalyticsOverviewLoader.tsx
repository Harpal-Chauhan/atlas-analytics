
import { Suspense } from "react";
import AnalyticsOverview from "./AnalyticsOverview";

type AnalyticsOverviewLoaderProps = {
    searchParams: Promise<{
        startDate?: string;
        endDate?: string;
    }>;
};

const AnalyticsOverviewLoader = async ({
    searchParams,
}: AnalyticsOverviewLoaderProps) => {
    const params = await searchParams;

    return (
        <div className="min-w-0 w-full">

            <Suspense
                fallback={
                    <section
                        className="mt-6 space-y-6 sm:mt-8"
                        aria-label="Loading analytics dashboard"
                    >
                        {/* HEADER SKELETON */}

                        <div className="animate-pulse rounded-2xl border border-[#DCE8DD] bg-white p-5 sm:p-6">
                            <div className="h-3 w-32 rounded bg-[#E8EEE7]" />
                            <div className="mt-4 h-7 w-56 max-w-full rounded bg-[#E8EEE7]" />
                            <div className="mt-3 h-4 w-72 max-w-full rounded bg-[#F0F3ED]" />
                        </div>

                        {/* LIVE ACTIVITY SKELETON */}

                        <div className="animate-pulse rounded-2xl border border-[#DCE8DD] bg-white p-5 sm:p-6">
                            <div className="h-5 w-36 rounded bg-[#E8EEE7]" />
                            <div className="mt-5 h-24 rounded-xl bg-[#F0F3ED]" />
                        </div>

                        {/* KPI SKELETON */}

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="animate-pulse rounded-2xl border border-[#DCE8DD] bg-white p-5"
                                >
                                    <div className="h-3 w-24 rounded bg-[#E8EEE7]" />
                                    <div className="mt-5 h-8 w-20 rounded bg-[#E8EEE7]" />
                                    <div className="mt-3 h-3 w-28 rounded bg-[#F0F3ED]" />
                                </div>
                            ))}
                        </div>

                        {/* CHART SKELETON */}

                        <div className="animate-pulse rounded-2xl border border-[#DCE8DD] bg-white p-5 sm:p-6">
                            <div className="h-5 w-40 rounded bg-[#E8EEE7]" />
                            <div className="mt-6 h-48 rounded-xl bg-[#F0F3ED] sm:h-64" />
                        </div>

                    </section>
                }
            >
                <AnalyticsOverview
                    startDate={params.startDate}
                    endDate={params.endDate}
                />
            </Suspense>

        </div>
    );
};

export default AnalyticsOverviewLoader;

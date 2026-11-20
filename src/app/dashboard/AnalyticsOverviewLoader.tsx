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
    <AnalyticsOverview startDate={params.startDate} endDate={params.endDate} />
  );
};

export default AnalyticsOverviewLoader;
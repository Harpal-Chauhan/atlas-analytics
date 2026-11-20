import type { ReactNode } from "react";
import { Suspense } from "react";
import { auth } from "@/auth";
import HourlyActivity from "./HourlyActivity";

type DashboardLayoutProps = {
  children: ReactNode;
};

const DashboardLayout = async ({ children }: DashboardLayoutProps) => {
  const session = await auth();

  const userId = session?.user?.id;
  const tenantId = session?.user?.activeTenantId;

  return (
    <>
      {userId && tenantId ? (
        <section className="grid grid-cols-1 gap-6 p-4">

          <Suspense
            fallback={
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                Loading hourly activity...
              </div>
            }
          >
            <HourlyActivity userId={userId} tenantId={tenantId} />
          </Suspense>
        </section>
      ) : (
        <div className="m-4 rounded border border-yellow-300 bg-yellow-50 p-3 text-sm">
          User session or active organization is missing.
        </div>
      )}

      {children}
    </>
  );
};

export default DashboardLayout;

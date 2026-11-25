import { opsPrisma } from "@/lib/ops-prisma";
import TenantSuspensionButton from "./TenantSuspensionButton";

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US").format(value);

const OpsPage = async () => {
  const now = new Date();

  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  const [tenants, eventCounts, monthlyUsages] = await Promise.all([
    opsPrisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        suspendedAt: true,
        createdAt: true,
        monthlyEventQuota: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

    opsPrisma.event.groupBy({
      by: ["tenantId"],
      _count: {
        _all: true,
      },
    }),

    opsPrisma.tenantMonthlyUsage.findMany({
      where: {
        monthStart,
      },
      select: {
        tenantId: true,
        eventCount: true,
      },
    }),
  ]);

  const eventCountMap = new Map(
    eventCounts.map((item) => [item.tenantId, item._count._all]),
  );

  const usageMap = new Map(
    monthlyUsages.map((item) => [item.tenantId, item.eventCount]),
  );

  const totalEvents = eventCounts.reduce(
    (total, item) => total + item._count._all,
    0,
  );

  const activeTenants = tenants.filter((tenant) => !tenant.suspendedAt).length;

  const suspendedTenants = tenants.length - activeTenants;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-7 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Page Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#B9DDC8] bg-[#EAF3E9] px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-[#20B58A]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#176C52]">
              Internal Operations
            </span>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-[#142B27] sm:text-3xl">
            Ops Console
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718078]">
            Monitor organizations, track event activity, and manage tenant
            access from one central operations dashboard.
          </p>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#DCE8DD] bg-white px-4 py-3 shadow-sm">
          <svg
            className="h-5 w-5 text-[#20B58A]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v2m7.071.929-1.414 1.414M21 12h-2m-1.929 7.071-1.414-1.414M12 21v-2m-7.071-1.929 1.414-1.414M3 12h2m1.929-7.071 1.414 1.414"
            />
            <circle cx="12" cy="12" r="4" />
          </svg>
          <span className="text-xs font-semibold text-[#176C52]">
            System Overview
          </span>
        </div>
      </header>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Tenants */}
        <div className="rounded-2xl border border-[#DCE8DD] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF3E9]">
              <svg
                className="h-5 w-5 text-[#176C52]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m16 0v-2a4 4 0 0 0-3-3.87M14 3.13a4 4 0 0 1 0 7.75M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
                />
              </svg>
            </div>
            <span className="rounded-full bg-[#EAF3E9] px-2.5 py-1 text-xs font-semibold text-[#176C52]">
              Organizations
            </span>
          </div>

          <p className="mt-5 text-sm font-medium text-[#718078]">
            Total Tenants
          </p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight text-[#142B27]">
            {formatNumber(tenants.length)}
          </p>
          <p className="mt-2 text-xs text-[#829087]">
            Registered organizations
          </p>
        </div>

        {/* Total Events */}
        <div className="rounded-2xl border border-[#DCE8DD] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F0F5D9]">
              <svg
                className="h-5 w-5 text-[#657D24]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 2 4.5 13h6L10 22l9.5-12h-6L13 2Z"
                />
              </svg>
            </div>
            <span className="rounded-full bg-[#F0F5D9] px-2.5 py-1 text-xs font-semibold text-[#657D24]">
              All Time
            </span>
          </div>

          <p className="mt-5 text-sm font-medium text-[#718078]">
            Total Events
          </p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight text-[#142B27]">
            {formatNumber(totalEvents)}
          </p>
          <p className="mt-2 text-xs text-[#829087]">
            Events across all tenants
          </p>
        </div>

        {/* Active Tenants */}
        <div className="rounded-2xl border border-[#DCE8DD] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF3E9]">
              <svg
                className="h-5 w-5 text-[#20B58A]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m5 12 4 4L19 6"
                />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <span className="rounded-full bg-[#EAF3E9] px-2.5 py-1 text-xs font-semibold text-[#176C52]">
              Active
            </span>
          </div>

          <p className="mt-5 text-sm font-medium text-[#718078]">
            Active Tenants
          </p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight text-[#142B27]">
            {formatNumber(activeTenants)}
          </p>
          <p className="mt-2 text-xs text-[#829087]">
            Currently enabled organizations
          </p>
        </div>

        {/* Suspended Tenants */}
        <div className="rounded-2xl border border-[#DCE8DD] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF0EB]">
              <svg
                className="h-5 w-5 text-[#B85D46]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v4m0 4h.01"
                />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <span className="rounded-full bg-[#FFF0EB] px-2.5 py-1 text-xs font-semibold text-[#B85D46]">
              Restricted
            </span>
          </div>

          <p className="mt-5 text-sm font-medium text-[#718078]">
            Suspended Tenants
          </p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight text-[#142B27]">
            {formatNumber(suspendedTenants)}
          </p>
          <p className="mt-2 text-xs text-[#829087]">
            Organizations currently suspended
          </p>
        </div>
      </section>

      {/* Tenant Management */}
      <section className="overflow-hidden rounded-2xl border border-[#DCE8DD] bg-white shadow-sm">
        {/* Section Header */}
        <div className="flex flex-col gap-3 border-b border-[#EAF0E9] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF3E9]">
                <svg
                  className="h-5 w-5 text-[#176C52]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 21h18M5 21V7l8-4v18m6 0V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01M15 14v.01M15 17v.01"
                  />
                </svg>
              </div>

              <h2 className="text-lg font-bold text-[#142B27]">
                Tenant Management
              </h2>
            </div>

            <p className="mt-2 text-sm text-[#829087]">
              Monitor tenant activity and monthly quota usage (UTC calendar
              month).
            </p>
          </div>

          <span className="w-fit rounded-full border border-[#DCE8DD] bg-[#F8FAF4] px-3 py-1.5 text-xs font-semibold text-[#176C52]">
            {formatNumber(tenants.length)} Tenants
          </span>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-[#F8FAF4] text-xs uppercase tracking-wider text-[#718078]">
              <tr>
                <th className="px-5 py-4 font-bold sm:px-6">Tenant</th>
                <th className="px-5 py-4 font-bold">Slug</th>
                <th className="px-5 py-4 font-bold">Total Events</th>
                <th className="px-5 py-4 font-bold">Monthly Quota</th>
                <th className="px-5 py-4 font-bold">Used This Month</th>
                <th className="px-5 py-4 font-bold">Remaining</th>
                <th className="px-5 py-4 font-bold">Status</th>
                <th className="px-5 py-4 font-bold">Created</th>
                <th className="px-5 py-4 font-bold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#EAF0E9]">
              {tenants.map((tenant) => {
                const used = usageMap.get(tenant.id) ?? 0;
                const remaining = Math.max(0, tenant.monthlyEventQuota - used);

                return (
                  <tr key={tenant.id} className="transition hover:bg-[#F8FAF4]">
                    <td className="px-5 py-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF3E9] text-sm font-bold text-[#176C52]">
                          {tenant.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-[#142B27]">
                          {tenant.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-[#718078]">{tenant.slug}</td>

                    <td className="px-5 py-4 font-semibold tabular-nums text-[#142B27]">
                      {formatNumber(eventCountMap.get(tenant.id) ?? 0)}
                    </td>

                    <td className="px-5 py-4 tabular-nums text-[#718078]">
                      {formatNumber(tenant.monthlyEventQuota)}
                    </td>

                    <td className="px-5 py-4 font-semibold tabular-nums text-[#176C52]">
                      {formatNumber(used)}
                    </td>

                    <td className="px-5 py-4 tabular-nums text-[#718078]">
                      {formatNumber(remaining)}
                    </td>

                    <td className="px-5 py-4">
                      {tenant.suspendedAt ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF0EB] px-2.5 py-1 text-xs font-bold text-[#B85D46]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#FF896D]" />
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF3E9] px-2.5 py-1 text-xs font-bold text-[#176C52]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#20B58A]" />
                          Active
                        </span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-[#718078]">
                      {tenant.createdAt.toLocaleDateString("en-IN")}
                    </td>

                    <td className="px-5 py-4">
                      <TenantSuspensionButton
                        tenantId={tenant.id}
                        isSuspended={Boolean(tenant.suspendedAt)}
                      />
                    </td>
                  </tr>
                );
              })}

              {tenants.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF3E9]">
                      <svg
                        className="h-7 w-7 text-[#176C52]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.8}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 21h18M5 21V7l8-4v18m6 0V11l-6-4"
                        />
                      </svg>
                    </div>

                    <h3 className="mt-4 font-bold text-[#142B27]">
                      No tenants found
                    </h3>

                    <p className="mt-1 text-sm text-[#829087]">
                      Registered organizations will appear here.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="flex flex-col gap-2 border-t border-[#EAF0E9] bg-[#F8FAF4] px-5 py-4 text-xs text-[#829087] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>Showing {formatNumber(tenants.length)} registered tenants</span>
          <span>Monthly usage resets on the first day of each UTC month</span>
        </div>
      </section>
    </main>
  );
};

export default OpsPage;

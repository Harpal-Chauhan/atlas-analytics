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

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Ops Console</h1>
        <p className="mt-2 text-sm text-gray-500">
          Internal tenant and event monitoring.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-white p-5">
          <p className="text-sm text-gray-500">Total Tenants</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatNumber(tenants.length)}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-5">
          <p className="text-sm text-gray-500">Total Events</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatNumber(totalEvents)}
          </p>
        </div>
      </section>

      <section className="overflow-x-auto rounded-lg border bg-white">
        <div className="border-b p-5">
          <h2 className="font-semibold">Tenants</h2>
          <p className="mt-1 text-sm text-gray-500">
            Monthly quota usage (UTC calendar month).
          </p>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-4">Tenant</th>
              <th className="p-4">Slug</th>
              <th className="p-4">Total Events</th>
              <th className="p-4">Monthly Quota</th>
              <th className="p-4">Used This Month</th>
              <th className="p-4">Remaining</th>
              <th className="p-4">Status</th>
              <th className="p-4">Created</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>

          <tbody>
            {tenants.map((tenant) => {
              const used = usageMap.get(tenant.id) ?? 0;
              const remaining = Math.max(0, tenant.monthlyEventQuota - used);

              return (
                <tr key={tenant.id} className="border-t">
                  <td className="p-4 font-medium">{tenant.name}</td>

                  <td className="p-4">{tenant.slug}</td>

                  <td className="p-4">
                    {formatNumber(eventCountMap.get(tenant.id) ?? 0)}
                  </td>

                  <td className="p-4">
                    {formatNumber(tenant.monthlyEventQuota)}
                  </td>

                  <td className="p-4">{formatNumber(used)}</td>

                  <td className="p-4">{formatNumber(remaining)}</td>

                  <td className="p-4">
                    {tenant.suspendedAt ? (
                      <span className="text-red-600">Suspended</span>
                    ) : (
                      <span className="text-green-600">Active</span>
                    )}
                  </td>

                  <td className="p-4">
                    {tenant.createdAt.toLocaleDateString("en-IN")}
                  </td>

                  <td className="p-4">
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
                <td colSpan={9} className="p-6 text-center text-gray-500">
                  No tenants found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
};

export default OpsPage;

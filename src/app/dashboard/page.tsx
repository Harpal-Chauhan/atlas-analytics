import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import ApiKeysPanel from "./ApiKeysPanel";
import OrganizationSwitcher from "./OrganizationSwitcher";
import CreateOrganization from "./CreateOrganization";
import InviteMember from "./InviteMember";
import AnalyticsOverview from "./AnalyticsOverview";

const DashboardPage = async () => {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const userName = session.user?.name || session.user?.email || "User";

  const organizations = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT set_config('app.user_id', ${userId}, true)
    `;

    const memberships = await tx.membership.findMany({
      where: { userId },
      select: { tenantId: true, role: true },
    });

    const result = [];

    for (const membership of memberships) {
      await tx.$queryRaw`
        SELECT set_config('app.tenant_id', ${membership.tenantId}, true)
      `;

      const tenant = await tx.tenant.findUnique({
        where: { id: membership.tenantId },
        select: {
          id: true,
          name: true,
          suspendedAt: true,
        },
      });

      if (tenant) {
        result.push({
          id: tenant.id,
          name: tenant.name,
          role: membership.role,
          suspended: tenant.suspendedAt !== null,
        });
      }
    }

    return result;
  });

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            ATLAS
          </Link>

          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-gray-600">Product Analytics</span>

            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <div>
                <p className="text-xs text-gray-500">Logged in as</p>
                <p className="max-w-48 truncate text-sm font-medium">
                  {userName}
                </p>
              </div>

              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-100"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

        <p className="mt-2 text-gray-600">
          Welcome to ATLAS Product Analytics.
        </p>

        <div className="mt-8">
          <OrganizationSwitcher />
        </div>

        <CreateOrganization />

        <InviteMember />

        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Your organizations</h2>

          {organizations.length === 0 ? (
            <p className="mt-2 text-sm text-gray-600">
              No organizations found for your account.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {organizations.map((organization) => (
                <div
                  key={organization.id}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <h3 className="font-medium">{organization.name}</h3>

                  <p className="mt-1 text-sm text-gray-600">
                    Role: {organization.role}
                  </p>

                  <p className="mt-1 text-sm text-gray-600">
                    Status: {organization.suspended ? "Suspended" : "Active"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <ApiKeysPanel />

        <AnalyticsOverview />
      </section>
    </main>
  );
};

export default DashboardPage;

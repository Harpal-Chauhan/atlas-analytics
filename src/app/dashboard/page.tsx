import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import ApiKeysPanel from "./ApiKeysPanel";
import OrganizationSwitcher from "./OrganizationSwitcher";
import CreateOrganization from "./CreateOrganization";
import InviteMember from "./InviteMember";
import DateRangePicker from "./DateRangePicker";
import { Suspense } from "react";
import OrganizationsList from "./OrganizationsList";
import AnalyticsOverviewLoader from "./AnalyticsOverviewLoader";

type DashboardPageProps = {
  searchParams: Promise<{
    startDate?: string;
    endDate: string;
  }>;
};

const DashboardPage = async ({ searchParams }: DashboardPageProps) => {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const userName = session.user?.name || session.user?.email || "User";

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

        <Suspense
          fallback={
            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 animate-pulse">
              <div className="h-6 w-48 rounded bg-gray-200" />
              <div className="mt-4 h-16 rounded bg-gray-100" />
            </div>
          }
        >
          <OrganizationsList userId={userId} />
        </Suspense>

        <ApiKeysPanel />

        <DateRangePicker />

        <Suspense
          fallback={
            <div className="mt-6 space-y-6 animate-pulse">
              <div className="h-8 w-48 rounded-lg bg-gray-200" />

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-28 rounded-xl border border-gray-200 bg-gray-100"
                  />
                ))}
              </div>

              <div className="h-64 rounded-xl border border-gray-200 bg-gray-100" />

              <div className="h-48 rounded-xl border border-gray-200 bg-gray-100" />
            </div>
          }
        >
          <AnalyticsOverviewLoader searchParams={searchParams} />
        </Suspense>
      </section>
    </main>
  );
};

export default DashboardPage;

import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { Suspense } from "react";

import DashboardShell from "./DashboardShell";
import ApiKeysPanel from "./ApiKeysPanel";
import OrganizationSwitcher from "./OrganizationSwitcher";
import CreateOrganization from "./CreateOrganization";
import InviteMember from "./InviteMember";
import DateRangePicker from "./DateRangePicker";
import OrganizationsList from "./OrganizationsList";
import AnalyticsOverviewLoader from "./AnalyticsOverviewLoader";

type DashboardPageProps = {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
  }>;
};

const DashboardPage = async ({ searchParams }: DashboardPageProps) => {
  const session = await auth();
  const userId = session?.user?.id;
  const tenantId = session?.user?.activeTenantId;

  if (!userId) {
    redirect("/login");
  }

  const userName = session.user?.name || session.user?.email || "User";

  const userInitial = userName.charAt(0).toUpperCase();

  async function logoutAction() {
    "use server";

    await signOut({
      redirectTo: "/login",
    });
  }

  return (
    <DashboardShell
      userName={userName}
      userInitial={userInitial}
      logoutAction={logoutAction}
    >
      <div className="space-y-8 sm:space-y-10">
        {/* WELCOME SECTION */}
        <section
          id="overview"
          className="scroll-mt-28 flex flex-col justify-between gap-5 md:flex-row md:items-center"
        >
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#DCE8C5] bg-[#EDF4DD] px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-[#20B58A]" />
              <span className="text-xs font-bold text-[#426B45]">
                Product Analytics Workspace
              </span>
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-[#142B27] sm:text-3xl lg:text-4xl">
              Welcome back, {userName.split(" ")[0]}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#71847A] sm:text-base">
              Monitor product performance, understand user behavior, and make
              data-driven decisions with ATLAS Analytics.
            </p>
          </div>

          <div className="w-full rounded-2xl border border-[#DCE5D9] bg-white px-5 py-4 shadow-sm md:w-auto">
            <p className="text-xs font-semibold text-[#8A9B91]">Platform</p>
            <p className="mt-1 text-sm font-extrabold text-[#176C52]">
              Multi-Tenant Analytics
            </p>
          </div>
        </section>

        {/* ORGANIZATION SECTION */}
        <section id="organizations" className="scroll-mt-28 space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-[#142B27] sm:text-xl">
                Organization Management
              </h2>
              <p className="mt-1 text-sm text-[#71847A]">
                Manage your workspace and organizations.
              </p>
            </div>

            <span className="w-fit rounded-xl border border-[#DCE5D9] bg-white px-3 py-2 text-xs font-bold text-[#61766A]">
              Workspace Settings
            </span>
          </div>

          <div className="rounded-2xl border border-[#DCE5D9] bg-white p-4 shadow-sm sm:p-6">
            <OrganizationSwitcher />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-2xl border border-[#DCE5D9] bg-white p-4 shadow-sm sm:p-6">
              <h3 className="mb-4 text-sm font-extrabold text-[#142B27]">
                Create Organization
              </h3>
              <CreateOrganization />
            </div>

            <div
              id="team"
              className="scroll-mt-28 rounded-2xl border border-[#DCE5D9] bg-white p-4 shadow-sm sm:p-6"
            >
              <h3 className="mb-4 text-sm font-extrabold text-[#142B27]">
                Invite Team Members
              </h3>
              <InviteMember />
            </div>
          </div>

          <div className="rounded-2xl border border-[#DCE5D9] bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5">
              <h3 className="text-base font-extrabold text-[#142B27]">
                Your Organizations
              </h3>
              <p className="mt-1 text-sm text-[#71847A]">
                View and manage your organization memberships.
              </p>
            </div>

            <Suspense
              fallback={
                <div className="animate-pulse space-y-3">
                  <div className="h-12 rounded-xl bg-[#EDF2EA]" />
                  <div className="h-12 rounded-xl bg-[#EDF2EA]" />
                </div>
              }
            >
              <OrganizationsList userId={userId} />
            </Suspense>
          </div>
        </section>

        {/* API KEY MANAGEMENT */}
        <section id="api-keys" className="scroll-mt-28 space-y-4">
          <div>
            <h2 className="text-lg font-extrabold text-[#142B27] sm:text-xl">
              Developer Settings
            </h2>
            <p className="mt-1 text-sm text-[#71847A]">
              Manage API credentials for event ingestion.
            </p>
          </div>

          <div className="rounded-2xl border border-[#DCE5D9] bg-white p-4 shadow-sm sm:p-6">
            <ApiKeysPanel />
          </div>
        </section>

        {/* ANALYTICS SECTION */}
        <section id="analytics" className="scroll-mt-28 space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-[#142B27] sm:text-2xl">
                Analytics Overview
              </h2>
              <p className="mt-1 text-sm text-[#71847A]">
                Track engagement, activity, and product performance.
              </p>
            </div>

            <div className="w-fit rounded-xl border border-[#CDE9D9] bg-[#EAF5ED] px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#20B58A]" />
                <span className="text-xs font-bold text-[#176C52]">
                  Analytics Workspace
                </span>
              </div>
            </div>
          </div>

          {/* DATE FILTER */}
          <div className="rounded-2xl border border-[#DCE5D9] bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3">
              <h3 className="text-sm font-extrabold text-[#142B27]">
                Date Range
              </h3>
              <p className="mt-1 text-xs text-[#71847A]">
                Select the reporting period for your analytics.
              </p>
            </div>

            <DateRangePicker />
          </div>

          {/* ANALYTICS DATA */}
          <Suspense
            fallback={
              <div className="animate-pulse space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-32 rounded-2xl border border-[#DCE5D9] bg-white"
                    />
                  ))}
                </div>

                <div className="h-80 rounded-2xl border border-[#DCE5D9] bg-white" />

                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="h-64 rounded-2xl border border-[#DCE5D9] bg-white" />
                  <div className="h-64 rounded-2xl border border-[#DCE5D9] bg-white" />
                </div>
              </div>
            }
          >
            <AnalyticsOverviewLoader searchParams={searchParams} />
          </Suspense>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-[#DCE5D9] pt-6">
          <div className="flex flex-col justify-between gap-2 pb-4 text-xs text-[#84958B] sm:flex-row">
            <p>
              © {new Date().getFullYear()} ATLAS Product Analytics. All rights
              reserved.
            </p>
            <p>Analytics Infrastructure & Workspace Management</p>
          </div>
        </footer>
      </div>
    </DashboardShell>
  );
};

export default DashboardPage;

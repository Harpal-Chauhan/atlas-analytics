import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOpsUser } from "@/lib/ops-auth";

export const dynamic = "force-dynamic";

type OpsLayoutProps = {
  children: ReactNode;
};

const OpsLayout = async ({ children }: OpsLayoutProps) => {
  const opsUser = await getOpsUser();

  if (!opsUser) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#F5F6EF]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-[#DCE8DD] bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex min-h-[76px] max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          {/* Brand */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#142B27]">
              <svg
                className="h-6 w-6 text-[#D6F36A]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 17.5 9 12l3.5 3.5L20 7"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 7h5v5"
                />
              </svg>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-[#142B27] sm:text-xl">
                  ATLAS
                </h1>

                <span className="rounded-md bg-[#EAF3E9] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#176C52]">
                  Ops
                </span>
              </div>

              <p className="hidden text-xs text-[#829087] sm:block">
                Internal Operations Console
              </p>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-[#DCE8DD] bg-[#F8FAF4] px-3 py-2 sm:flex">
              <span className="h-2 w-2 rounded-full bg-[#20B58A]" />
              <span className="text-xs font-semibold text-[#176C52]">
                Restricted Access
              </span>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-[#DCE8DD] bg-white px-3 py-2.5 text-xs font-semibold text-[#176C52] transition hover:border-[#20B58A] hover:bg-[#EAF3E9] sm:px-4 sm:text-sm"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m10.5 19.5-7.5-7.5 7.5-7.5M3 12h18"
                />
              </svg>

              <span>Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#DCE8DD] bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-2 px-4 py-5 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <p className="text-xs text-[#829087]">
            ATLAS Internal Operations Console
          </p>

          <p className="text-xs font-medium text-[#176C52]">
            Authorized Access Only
          </p>
        </div>
      </footer>
    </div>
  );
};

export default OpsLayout;

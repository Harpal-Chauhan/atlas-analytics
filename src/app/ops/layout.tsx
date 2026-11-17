import type { ReactNode } from "react";
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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <p className="text-lg font-semibold">ATLAS Ops</p>
          <p className="text-xs text-gray-500">Internal Operations Console</p>
        </div>
      </header>

      {children}
    </div>
  );
};

export default OpsLayout;
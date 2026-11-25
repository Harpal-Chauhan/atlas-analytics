import { prisma } from "@/lib/prisma";

type OrganizationsListProps = {
  userId: string;
};

const OrganizationsList = async ({ userId }: OrganizationsListProps) => {
  const organizations = await prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`
        SELECT set_config('app.user_id', ${userId}, true)
      `;

      const memberships = await tx.membership.findMany({
        where: { userId },
        select: { tenantId: true, role: true },
      });

      const result: Array<{
        id: string;
        name: string;
        role: (typeof memberships)[number]["role"];
        suspended: boolean;
      }> = [];

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
    },
    {
      maxWait: 10000,
      timeout: 60000,
    },
  );

  return (
    <section className="mt-6 min-w-0 overflow-hidden rounded-2xl border border-[#DCE8DD] bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-[#DCE8DD] bg-[#F8FAF4] px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF3E9] text-[#176C52]">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-bold text-[#142B27] sm:text-lg">
              Your Organizations
            </h2>
            <p className="mt-1 text-xs text-[#718078] sm:text-sm">
              Manage and view your organization memberships.
            </p>
          </div>
        </div>

        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#B9DDC8] bg-[#EAF3E9] px-3 py-1.5 text-xs font-semibold text-[#176C52]">
          <span className="h-2 w-2 rounded-full bg-[#20B58A]" />
          {organizations.length}{" "}
          {organizations.length === 1 ? "Organization" : "Organizations"}
        </span>
      </div>

      {/* Organization list */}
      <div className="space-y-3 p-4 sm:p-6">
        {organizations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#DCE8DD] bg-[#F8FAF4] px-4 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF3E9] text-[#176C52]">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </div>

            <h3 className="mt-3 text-sm font-bold text-[#142B27]">
              No organizations yet
            </h3>

            <p className="mt-1 max-w-sm text-xs leading-5 text-[#829087] sm:text-sm">
              You are not a member of any organization yet. Create an
              organization or accept an invitation to get started.
            </p>
          </div>
        ) : (
          organizations.map((organization) => (
            <div
              key={organization.id}
              className={`flex min-w-0 flex-col gap-3 rounded-xl border p-4 transition sm:flex-row sm:items-center sm:justify-between ${
                organization.suspended
                  ? "border-[#F3C8BC] bg-[#FFF9F6]"
                  : "border-[#DCE8DD] bg-white hover:border-[#B9DDC8] hover:bg-[#F8FAF4]"
              }`}
            >
              {/* Organization details */}
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    organization.suspended
                      ? "bg-[#FFF1EC] text-[#B85D46]"
                      : "bg-[#EAF3E9] text-[#176C52]"
                  }`}
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 21h18" />
                    <path d="M5 21V7l8-4v18" />
                    <path d="M19 21V11l-6-4" />
                    <path d="M9 9v.01" />
                    <path d="M9 12v.01" />
                    <path d="M9 15v.01" />
                    <path d="M9 18v.01" />
                  </svg>
                </div>

                <div className="min-w-0">
                  <p className="break-words text-sm font-bold text-[#142B27] sm:text-base">
                    {organization.name}
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-[#829087]">Role:</span>

                    <span className="rounded-md bg-[#EAF3E9] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#176C52]">
                      {organization.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Organization status */}
              <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                {organization.suspended ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-[#FF896D]" />
                    <span className="rounded-full border border-[#F3C8BC] bg-[#FFF1EC] px-3 py-1.5 text-xs font-semibold text-[#B85D46]">
                      Suspended
                    </span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-[#20B58A]" />
                    <span className="rounded-full border border-[#B9DDC8] bg-[#EAF3E9] px-3 py-1.5 text-xs font-semibold text-[#176C52]">
                      Active
                    </span>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {organizations.length > 0 && (
        <div className="border-t border-[#DCE8DD] bg-[#F8FAF4] px-4 py-3 sm:px-6">
          <p className="text-xs text-[#829087]">
            Organization access is based on your assigned membership role.
          </p>
        </div>
      )}
    </section>
  );
};

export default OrganizationsList;

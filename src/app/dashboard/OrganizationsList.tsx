
import { prisma } from "@/lib/prisma";

type OrganizationsListProps = {
  userId: string;
};

const OrganizationsList = async ({ userId }: OrganizationsListProps) => {
  const organizations = await prisma.$transaction(async (tx) => {
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
  });

  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Your organizations</h2>

      <div className="mt-4 space-y-3">
        {organizations.length === 0 ? (
          <p className="text-sm text-gray-500">
            You are not a member of any organization yet.
          </p>
        ) : (
          organizations.map((organization) => (
            <div
              key={organization.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 p-3"
            >
              <div>
                <p className="font-medium">{organization.name}</p>
                <p className="text-sm text-gray-500">
                  Role: {organization.role}
                </p>
              </div>

              {organization.suspended && (
                <span className="text-sm font-medium text-red-600">
                  Suspended
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OrganizationsList;

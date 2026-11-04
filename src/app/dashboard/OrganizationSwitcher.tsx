"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Organization = {
  id: string;
  name: string;
  role: string;
  suspended: boolean;
};

const OrganizationSwitcher = () => {
  const { data: session, update, status } = useSession();
  const router = useRouter();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [message, setMessage] = useState("");

  const activeTenantId = session?.user?.activeTenantId || "";

  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        const response = await fetch("/organizations", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load organizations.");
        }

        setOrganizations(data.organizations || []);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to load organizations.",
        );
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      loadOrganizations();
    }
  }, [status]);

  const handleSwitch = async (tenantId: string) => {
    if (!tenantId || tenantId === activeTenantId || switching) {
      return;
    }

    setSwitching(true);
    setMessage("");

    try {
      const updatedSession = await update({
        activeTenantId: tenantId,
      });

      if (updatedSession?.user?.activeTenantId !== tenantId) {
        throw new Error("You cannot switch to this organization.");
      }

      setMessage("Organization switched successfully.");

      // Refresh server components without a full page reload.
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to switch organization.",
      );
    } finally {
      setSwitching(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading organizations...</p>;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <label
        htmlFor="organization"
        className="mb-2 block text-sm font-medium text-gray-700"
      >
        Active Organization
      </label>

      <select
        id="organization"
        value={activeTenantId}
        onChange={(event) => handleSwitch(event.target.value)}
        disabled={switching}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
      >
        {organizations
          .filter((organization) => !organization.suspended)
          .map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name} ({organization.role})
            </option>
          ))}
      </select>

      {switching && (
        <p className="mt-2 text-sm text-gray-500">Switching organization...</p>
      )}

      {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
    </div>
  );
};

export default OrganizationSwitcher;

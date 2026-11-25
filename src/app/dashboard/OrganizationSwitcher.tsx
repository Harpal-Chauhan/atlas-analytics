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
    } else if (status === "unauthenticated") {
      setLoading(false);
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

  const activeOrganization = organizations.find(
    (organization) => organization.id === activeTenantId,
  );

  const availableOrganizations = organizations.filter(
    (organization) => !organization.suspended,
  );

  if (loading || status === "loading") {
    return (
      <div className="min-w-0 animate-pulse rounded-2xl border border-[#DCE8DD] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-[#EAF3E9]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-36 rounded bg-[#EAF3E9]" />
            <div className="h-3 w-48 max-w-full rounded bg-[#F0F3ED]" />
          </div>
        </div>
        <div className="mt-4 h-11 rounded-xl bg-[#F0F3ED]" />
      </div>
    );
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-[#DCE8DD] bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#DCE8DD] bg-[#F8FAF4] px-4 py-4 sm:px-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF3E9] text-[#176C52]">
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

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-[#142B27] sm:text-base">
            Organization Switcher
          </h2>
          <p className="mt-1 text-xs text-[#718078]">
            Manage your active workspace.
          </p>
        </div>

        <span className="hidden shrink-0 rounded-full border border-[#B9DDC8] bg-[#EAF3E9] px-2.5 py-1 text-[10px] font-bold text-[#176C52] sm:inline-flex">
          WORKSPACE
        </span>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {/* Active organization */}
        <div className="rounded-xl border border-[#DCE8DD] bg-[#F8FAF4] p-3 sm:p-4">
          <p className="text-xs font-semibold text-[#829087]">
            CURRENT ORGANIZATION
          </p>

          <div className="mt-2 flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EAF3E9] text-[#176C52]">
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

            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-bold text-[#142B27]">
                {activeOrganization?.name || "No active organization"}
              </p>

              {activeOrganization && (
                <p className="mt-1 text-xs text-[#718078]">
                  Your role: {activeOrganization.role}
                </p>
              )}
            </div>

            {activeOrganization && !activeOrganization.suspended && (
              <span className="shrink-0 rounded-full bg-[#EAF3E9] px-2 py-1 text-[10px] font-bold text-[#176C52]">
                ACTIVE
              </span>
            )}
          </div>
        </div>

        {/* Organization selection */}
        <div>
          <label
            htmlFor="organization"
            className="mb-2 block text-sm font-semibold text-[#142B27]"
          >
            Switch Organization
          </label>

          <div className="relative">
            <select
              id="organization"
              value={activeTenantId}
              onChange={(event) => handleSwitch(event.target.value)}
              disabled={switching || availableOrganizations.length === 0}
              className="w-full appearance-none rounded-xl border border-[#DCE8DD] bg-[#F8FAF4] px-4 py-3 pr-10 text-sm font-medium text-[#142B27] outline-none transition focus:border-[#20B58A] focus:bg-white focus:ring-4 focus:ring-[#20B58A]/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {availableOrganizations.length === 0 ? (
                <option value="">No available organizations</option>
              ) : (
                availableOrganizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name} ({organization.role})
                  </option>
                ))
              )}
            </select>

            <svg
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718078]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>

          <p className="mt-2 text-xs leading-5 text-[#829087]">
            Select an organization to update your active workspace.
          </p>
        </div>

        {/* Switching state */}
        {switching && (
          <div className="flex items-center gap-2 rounded-xl border border-[#DCE8DD] bg-[#F8FAF4] p-3 text-xs font-medium text-[#176C52]">
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 0 1 8-8V0C5.37 0 0 5.37 0 12h4z"
              />
            </svg>
            Switching organization...
          </div>
        )}

        {/* Status message */}
        {message && (
          <div
            role="status"
            aria-live="polite"
            className={`flex items-start gap-2 rounded-xl border p-3 text-xs leading-5 ${
              message.includes("successfully")
                ? "border-[#B9DDC8] bg-[#EAF3E9] text-[#176C52]"
                : "border-[#F3C8BC] bg-[#FFF1EC] text-[#B85D46]"
            }`}
          >
            <span className="font-bold">
              {message.includes("successfully") ? "✓" : "!"}
            </span>
            <p className="break-words">{message}</p>
          </div>
        )}

        {/* Organization summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#DCE8DD] pt-4">
          <p className="text-xs text-[#829087]">Available organizations</p>

          <span className="rounded-full bg-[#EAF3E9] px-2.5 py-1 text-xs font-bold text-[#176C52]">
            {availableOrganizations.length} Available
          </span>
        </div>
      </div>
    </section>
  );
};

export default OrganizationSwitcher;

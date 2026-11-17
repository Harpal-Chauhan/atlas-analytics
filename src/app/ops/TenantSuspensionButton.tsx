"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TenantSuspensionButtonProps = {
  tenantId: string;
  isSuspended: boolean;
};

const TenantSuspensionButton = ({
  tenantId,
  isSuspended,
}: TenantSuspensionButtonProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSuspension = async () => {
    const action = isSuspended ? "unsuspend" : "suspend";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} this tenant?`,
    );

    if (!confirmed) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/ops/tenants/${tenantId}/suspension`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          suspended: !isSuspended,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update tenant.");
      }

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleSuspension}
        disabled={loading}
        className={`rounded-md px-3 py-2 text-xs font-medium disabled:opacity-50 ${
          isSuspended
            ? "bg-green-100 text-green-700 hover:bg-green-200"
            : "bg-red-100 text-red-700 hover:bg-red-200"
        }`}
      >
        {loading ? "Updating..." : isSuspended ? "Unsuspend" : "Suspend"}
      </button>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default TenantSuspensionButton;

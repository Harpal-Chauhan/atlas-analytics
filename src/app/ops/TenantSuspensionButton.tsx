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
    if (loading) return;

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
    <div className="flex min-w-[110px] flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleSuspension}
        disabled={loading}
        aria-busy={loading}
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition duration-200 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
          isSuspended
            ? "border border-[#B9DDC8] bg-[#EAF3E9] text-[#176C52] hover:bg-[#DCEBDD] focus:ring-[#20B58A]/15"
            : "border border-[#FFD5C9] bg-[#FFF0EB] text-[#B85D46] hover:bg-[#FFE4DC] focus:ring-[#FF896D]/15"
        }`}
      >
        {loading ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
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
                d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"
              />
            </svg>
            Updating...
          </>
        ) : isSuspended ? (
          <>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 5v14m-7-7h14"
              />
            </svg>
            Unsuspend
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 6 6 18M6 6l12 12"
              />
            </svg>
            Suspend
          </>
        )}
      </button>

      {error && (
        <p
          role="alert"
          className="max-w-[180px] text-xs leading-5 text-[#B85D46]"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default TenantSuspensionButton;

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const CreateOrganization = () => {
  const router = useRouter();
  const { update } = useSession();

  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to create organization.");
        return;
      }

      await update({
        activeTenantId: data.organization.id,
      });

      setName("");
      setMessage("Organization created successfully.");
      router.refresh();
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-6 w-full min-w-0 overflow-hidden rounded-2xl border border-[#DCE8DD] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#DCE8DD] bg-[#F8FAF4] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF3E9] text-[#176C52]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 8v8" />
              <path d="M8 12h8" />
              <rect x="3" y="3" width="18" height="18" rx="4" />
            </svg>
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-bold text-[#142B27] sm:text-lg">
              Create Organization
            </h2>
            <p className="mt-1 text-xs text-[#718078] sm:text-sm">
              Set up a new workspace for your team.
            </p>
          </div>
        </div>

        <span className="w-fit rounded-full border border-[#DCE8DD] bg-white px-3 py-1 text-xs font-semibold text-[#176C52]">
          New Workspace
        </span>
      </div>

      <div className="p-5 sm:p-6">
        <form
          onSubmit={handleSubmit}
          className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1">
            <label
              htmlFor="organization-name"
              className="mb-2 block text-sm font-semibold text-[#142B27]"
            >
              Organization Name
            </label>

            <input
              id="organization-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Acme Analytics"
              minLength={2}
              maxLength={100}
              required
              disabled={loading}
              className="h-12 w-full min-w-0 rounded-xl border border-[#DCE8DD] bg-[#F8FAF4] px-4 text-sm text-[#142B27] outline-none transition placeholder:text-[#9AA69E] hover:border-[#A9C7B4] focus:border-[#20B58A] focus:bg-white focus:ring-4 focus:ring-[#20B58A]/10 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <p className="mt-2 text-xs text-[#829087]">
              Choose a name between 2 and 100 characters.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || name.trim().length < 2}
            className="flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#176C52] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#142B27] focus:outline-none focus:ring-4 focus:ring-[#20B58A]/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {loading ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
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
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Creating...
              </>
            ) : (
              <>
                Create Organization
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </form>

        {message && (
          <div
            role="status"
            aria-live="polite"
            className={`mt-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
              message === "Organization created successfully."
                ? "border-[#B9DEC9] bg-[#EAF3E9] text-[#176C52]"
                : "border-[#F2C9BE] bg-[#FFF1ED] text-[#B85D46]"
            }`}
          >
            <span className="font-bold">
              {message === "Organization created successfully." ? "✓" : "!"}
            </span>
            <p className="min-w-0 break-words">{message}</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default CreateOrganization;

"use client";

import { useState } from "react";

const InviteMember = () => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "VIEWER">("VIEWER");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [invitationUrl, setInvitationUrl] = useState("");

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setInvitationUrl("");

    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to send invitation.");
      }

      setMessage(data.message || "Invitation sent successfully.");
      setInvitationUrl(data.invitationUrl || "");
      setEmail("");
      setRole("VIEWER");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!invitationUrl) return;

    try {
      await navigator.clipboard.writeText(invitationUrl);
      setMessage("Invitation link copied successfully.");
    } catch {
      setMessage("Unable to copy invitation link. Please copy it manually.");
    }
  };

  return (
    <section className="mt-6 min-w-0 overflow-hidden rounded-2xl border border-[#DCE8DD] bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-[#DCE8DD] bg-[#F8FAF4] px-4 py-5 sm:px-6">
        <div className="flex items-start gap-3">
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M19 8v6M22 11h-6" />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-[#142B27] sm:text-lg">
                Invite Team Member
              </h2>

              <span className="rounded-full bg-[#EAF3E9] px-2.5 py-1 text-[10px] font-bold tracking-wide text-[#176C52]">
                TEAM ACCESS
              </span>
            </div>

            <p className="mt-1 text-xs leading-5 text-[#718078] sm:text-sm">
              Invite someone to join your active organization and collaborate
              with your team.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="p-4 sm:p-6">
        <form onSubmit={handleInvite} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Email */}
            <div className="min-w-0">
              <label
                htmlFor="invite-email"
                className="mb-2 block text-sm font-semibold text-[#142B27]"
              >
                Email Address
              </label>

              <input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                maxLength={254}
                placeholder="member@example.com"
                className="w-full min-w-0 rounded-xl border border-[#DCE8DD] bg-[#F8FAF4] px-4 py-3 text-sm text-[#142B27] outline-none transition placeholder:text-[#829087] focus:border-[#20B58A] focus:bg-white focus:ring-4 focus:ring-[#20B58A]/10"
              />

              <p className="mt-1.5 text-xs text-[#829087]">
                Enter the email address of your team member.
              </p>
            </div>

            {/* Role */}
            <div className="min-w-0">
              <label
                htmlFor="invite-role"
                className="mb-2 block text-sm font-semibold text-[#142B27]"
              >
                Member Role
              </label>

              <select
                id="invite-role"
                value={role}
                onChange={(event) =>
                  setRole(event.target.value as "ADMIN" | "VIEWER")
                }
                className="w-full rounded-xl border border-[#DCE8DD] bg-[#F8FAF4] px-4 py-3 text-sm font-medium text-[#142B27] outline-none transition focus:border-[#20B58A] focus:bg-white focus:ring-4 focus:ring-[#20B58A]/10"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="VIEWER">VIEWER</option>
              </select>

              <p className="mt-1.5 text-xs text-[#829087]">
                Select the access role for this member.
              </p>
            </div>
          </div>

          {/* Role information */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#DCE8DD] bg-[#F8FAF4] p-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#20B58A]" />
                <p className="text-xs font-bold text-[#176C52]">ADMIN</p>
              </div>
              <p className="mt-1 text-xs leading-5 text-[#718078]">
                {
                  "Organization management access, subject to your app's permission rules."
                }
              </p>
            </div>

            <div className="rounded-xl border border-[#DCE8DD] bg-[#F8FAF4] p-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#D6F36A]" />
                <p className="text-xs font-bold text-[#176C52]">VIEWER</p>
              </div>
              <p className="mt-1 text-xs leading-5 text-[#718078]">
                {"Read-only access, subject to your app's permission rules."}
              </p>
            </div>
          </div>

          {/* Submit */}
          <div className="flex flex-col gap-3 border-t border-[#DCE8DD] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-[#829087]">
              An invitation link will be generated after a successful request.
            </p>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#142B27] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#176C52] focus:outline-none focus:ring-4 focus:ring-[#20B58A]/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {loading ? (
                <>
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
                  Sending...
                </>
              ) : (
                <>
                  Send Invitation
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 2 11 13" />
                    <path d="m22 2-7 20-4-9-9-4Z" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Status message */}
        {message && (
          <div
            role="status"
            aria-live="polite"
            className={`mt-5 flex items-start gap-2 rounded-xl border p-3 text-sm ${
              message.includes("successfully") ||
              message.includes("sent successfully")
                ? "border-[#B9DDC8] bg-[#EAF3E9] text-[#176C52]"
                : "border-[#F3C8BC] bg-[#FFF1EC] text-[#B85D46]"
            }`}
          >
            <span className="mt-0.5 shrink-0">
              {message.includes("successfully") ||
              message.includes("sent successfully")
                ? "✓"
                : "!"}
            </span>
            <p className="break-words">{message}</p>
          </div>
        )}

        {/* Invitation URL */}
        {invitationUrl && (
          <div className="mt-5 rounded-xl border border-[#B9DDC8] bg-[#F8FAF4] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-[#142B27]">
                Invitation Link
              </p>

              <span className="rounded-full bg-[#EAF3E9] px-2.5 py-1 text-[10px] font-bold text-[#176C52]">
                GENERATED
              </span>
            </div>

            <p className="mt-3 break-all rounded-lg border border-[#DCE8DD] bg-white p-3 text-xs leading-5 text-[#718078]">
              {invitationUrl}
            </p>

            <button
              type="button"
              onClick={handleCopy}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#20B58A] bg-white px-4 py-2.5 text-sm font-semibold text-[#176C52] transition hover:bg-[#EAF3E9] focus:outline-none focus:ring-4 focus:ring-[#20B58A]/10 sm:w-auto"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="8" y="8" width="13" height="13" rx="2" />
                <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
              </svg>
              Copy Invitation Link
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default InviteMember;

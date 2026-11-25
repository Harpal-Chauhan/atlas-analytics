"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const handleAccept = async () => {
    if (!token || loading) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to accept invitation.");
        return;
      }

      setSuccess(true);
      setMessage(data.message || "Invitation accepted successfully.");
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F6EF] px-4 py-10">
        <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[#DCE8DD] bg-white shadow-[0_20px_60px_rgba(20,43,39,0.08)]">
          <div className="h-2 bg-[#FF896D]" />

          <div className="px-6 py-10 text-center sm:px-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF0EB]">
              <svg
                className="h-8 w-8 text-[#B85D46]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v4m0 4h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z"
                />
              </svg>
            </div>

            <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-[#B85D46]">
              Invitation Error
            </p>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#142B27] sm:text-3xl">
              Invalid Invitation
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#718078]">
              The invitation link is missing its token. Please check the link
              you received and try again.
            </p>

            <Link
              href="/login"
              className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-[#142B27] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#176C52] focus:outline-none focus:ring-4 focus:ring-[#20B58A]/20 sm:w-auto"
            >
              Go to Login
              <svg
                className="ml-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 12h14m-7-7 7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F5F6EF] px-4 py-10 sm:px-6">
      {/* Background Decorations */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#D6F36A]/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-[#20B58A]/10 blur-3xl" />

      <div className="relative w-full max-w-lg">
        {/* Brand */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#142B27] shadow-lg shadow-[#142B27]/10">
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

          <span className="text-2xl font-extrabold tracking-tight text-[#142B27]">
            ATLAS
          </span>
        </div>

        {/* Invitation Card */}
        <div className="overflow-hidden rounded-3xl border border-[#DCE8DD] bg-white shadow-[0_24px_70px_rgba(20,43,39,0.09)]">
          <div className="h-2 bg-gradient-to-r from-[#20B58A] via-[#D6F36A] to-[#FF896D]" />

          <div className="p-6 sm:p-9">
            {/* Icon */}
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EAF3E9]">
              {success ? (
                <svg
                  className="h-8 w-8 text-[#176C52]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m5 12 4 4L19 6"
                  />
                </svg>
              ) : (
                <svg
                  className="h-8 w-8 text-[#176C52]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5A2.25 2.25 0 0 1 19.5 19.5h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0-9.3 6.2a1.8 1.8 0 0 1-1.9 0l-9.3-6.2"
                  />
                </svg>
              )}
            </div>

            {/* Heading */}
            <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-[#20B58A]">
              Organization Invitation
            </p>

            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#142B27] sm:text-4xl">
              {success ? "You're In!" : "Accept Invitation"}
            </h1>

            <p className="mt-4 text-sm leading-7 text-[#718078] sm:text-base">
              {success
                ? "Your invitation has been accepted successfully. You can now continue to your ATLAS dashboard."
                : "You have been invited to join an ATLAS organization. Log in using the invited email address before accepting the invitation."}
            </p>

            {/* Status Message */}
            {message && (
              <div
                role="status"
                aria-live="polite"
                className={`mt-6 flex items-start gap-3 rounded-xl border p-4 text-sm leading-6 ${
                  success
                    ? "border-[#B9DDC8] bg-[#EAF3E9] text-[#176C52]"
                    : "border-[#FFD5C9] bg-[#FFF0EB] text-[#B85D46]"
                }`}
              >
                {success ? (
                  <svg
                    className="mt-0.5 h-5 w-5 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m5 12 4 4L19 6"
                    />
                  </svg>
                ) : (
                  <svg
                    className="mt-0.5 h-5 w-5 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v4m0 4h.01"
                    />
                  </svg>
                )}

                <span>{message}</span>
              </div>
            )}

            {/* Accept Button */}
            {!success && (
              <button
                type="button"
                onClick={handleAccept}
                disabled={loading}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#142B27] px-5 py-4 text-sm font-bold text-white shadow-lg shadow-[#142B27]/10 transition duration-200 hover:bg-[#176C52] focus:outline-none focus:ring-4 focus:ring-[#20B58A]/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <svg
                      className="h-5 w-5 animate-spin"
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
                    Accepting Invitation...
                  </>
                ) : (
                  <>
                    Accept Invitation
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
                        d="M5 12h14m-7-7 7 7-7 7"
                      />
                    </svg>
                  </>
                )}
              </button>
            )}

            {/* Dashboard Button */}
            {success && (
              <Link
                href="/dashboard"
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#142B27] px-5 py-4 text-sm font-bold text-white shadow-lg shadow-[#142B27]/10 transition hover:bg-[#176C52] focus:outline-none focus:ring-4 focus:ring-[#20B58A]/20"
              >
                Go to Dashboard
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
                    d="M5 12h14m-7-7 7 7-7 7"
                  />
                </svg>
              </Link>
            )}

            {/* Login Link */}
            {!success && (
              <p className="mt-7 text-center text-sm text-[#718078]">
                Need to log in?{" "}
                <Link
                  href="/login"
                  className="font-bold text-[#176C52] underline-offset-4 transition hover:text-[#20B58A] hover:underline"
                >
                  Login
                </Link>
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-7 text-center text-xs text-[#829087]">
          Secure organization access powered by{" "}
          <span className="font-bold text-[#176C52]">ATLAS</span>
        </p>
      </div>
    </main>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F5F6EF] px-4">
          <div className="flex items-center gap-3 rounded-2xl border border-[#DCE8DD] bg-white px-6 py-5 shadow-sm">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#DCE8DD] border-t-[#20B58A]" />
            <span className="text-sm font-medium text-[#176C52]">
              Loading invitation...
            </span>
          </div>
        </main>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}

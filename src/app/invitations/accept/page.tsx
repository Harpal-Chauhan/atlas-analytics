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
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center">
          <h1 className="text-2xl font-bold">Invalid Invitation</h1>
          <p className="mt-3 text-sm text-gray-600">
            The invitation link is missing its token.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-medium text-blue-600 hover:underline"
          >
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8">
        <h1 className="text-2xl font-bold text-gray-900">Accept Invitation</h1>

        <p className="mt-3 text-sm text-gray-600">
          You have been invited to join an ATLAS organization. Log in using the
          invited email address before accepting.
        </p>

        {message && (
          <div
            className={`mt-5 rounded-lg p-3 text-sm ${
              success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        {!success && (
          <button
            type="button"
            onClick={handleAccept}
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Accepting..." : "Accept Invitation"}
          </button>
        )}

        {success && (
          <Link
            href="/dashboard"
            className="mt-6 block rounded-lg bg-gray-900 px-4 py-3 text-center text-sm font-medium text-white hover:bg-gray-700"
          >
            Go to Dashboard
          </Link>
        )}

        {!success && (
          <p className="mt-5 text-center text-sm text-gray-600">
            Need to log in?{" "}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:underline"
            >
              Login
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-50">
          Loading invitation...
        </main>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}

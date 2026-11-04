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

    await navigator.clipboard.writeText(invitationUrl);
    setMessage("Invitation link copied successfully.");
  };

  return (
    <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold">Invite Member</h2>

      <p className="mt-1 text-sm text-gray-600">
        Invite someone to join your active organization.
      </p>

      <form onSubmit={handleInvite} className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="invite-email"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Email address
          </label>

          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            maxLength={254}
            placeholder="member@example.com"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          />
        </div>

        <div>
          <label
            htmlFor="invite-role"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Member role
          </label>

          <select
            id="invite-role"
            value={role}
            onChange={(event) =>
              setRole(event.target.value as "ADMIN" | "VIEWER")
            }
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            <option value="ADMIN">ADMIN</option>
            <option value="VIEWER">VIEWER</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send Invitation"}
        </button>
      </form>

      {message && (
        <p className="mt-4 text-sm text-gray-700" role="status">
          {message}
        </p>
      )}

      {invitationUrl && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="break-all text-sm text-gray-700">{invitationUrl}</p>

          <button
            type="button"
            onClick={handleCopy}
            className="mt-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-100"
          >
            Copy invitation link
          </button>
        </div>
      )}
    </section>
  );
};

export default InviteMember;

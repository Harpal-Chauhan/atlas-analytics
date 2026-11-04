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
    <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold">Create organization</h2>

      <form
        onSubmit={handleSubmit}
        className="mt-4 flex flex-col gap-3 sm:flex-row"
      >
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Enter organization name"
          minLength={2}
          maxLength={100}
          required
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-gray-500"
        />

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create"}
        </button>
      </form>

      {message && <p className="mt-3 text-sm text-gray-600">{message}</p>}
    </div>
  );
};

export default CreateOrganization;

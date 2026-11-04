"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type ApiKeyItem = {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

const ApiKeysPanel = () => {
  const { data: session, status } = useSession();

  const activeTenantId = session?.user?.activeTenantId || "";

  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadKeys = useCallback(async () => {
    if (!activeTenantId) {
      setKeys([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/api-keys", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load API keys.");
      }

      setKeys(data.keys || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load API keys.");
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, [activeTenantId]);

  useEffect(() => {
    if (status === "authenticated") {
      setNewKey("");
      setMessage("");
      void loadKeys();
    }
  }, [status, activeTenantId, loadKeys]);

  const createKey = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setBusy(true);
    setError("");
    setMessage("");
    setNewKey("");

    try {
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not create API key.");
      }

      setNewKey(data.apiKey);
      setName("");
      setMessage("API key created. Copy and save it now.");

      await loadKeys();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create API key.",
      );
    } finally {
      setBusy(false);
    }
  };

  const revokeKey = async (id: string) => {
    const confirmed = window.confirm(
      "Revoke this API key? Applications using it should no longer be able to authenticate.",
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setMessage("");
    setNewKey("");

    try {
      const response = await fetch(`/api/api-keys/${id}`, {
        method: "PATCH",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not revoke API key.");
      }

      setMessage(data.message || "API key revoked.");
      await loadKeys();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not revoke API key.",
      );
    } finally {
      setBusy(false);
    }
  };

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(newKey);
      setMessage("API key copied to clipboard.");
    } catch {
      setError("Automatic copy failed. Select and copy the key manually.");
    }
  };

  return (
    <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold">API Keys</h2>

      <p className="mt-1 text-sm text-gray-600">
        Create and manage API keys for sending events to ATLAS.
      </p>

      <form
        onSubmit={createKey}
        className="mt-5 flex flex-col gap-3 sm:flex-row"
      >
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          minLength={2}
          maxLength={100}
          required
          placeholder="API key name"
          aria-label="API key name"
          className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
        />

        <button
          type="submit"
          disabled={busy || !activeTenantId}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {busy ? "Please wait..." : "Create API key"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {message && (
        <p role="status" className="mt-4 text-sm text-gray-700">
          {message}
        </p>
      )}

      {newKey && (
        <div className="mt-4 rounded-lg border border-gray-300 bg-gray-50 p-4">
          <p className="text-sm font-medium">Your new API key</p>

          <p className="mt-2 break-all rounded-md bg-white p-3 font-mono text-sm">
            {newKey}
          </p>

          <button
            type="button"
            onClick={copyKey}
            className="mt-3 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-100"
          >
            Copy API key
          </button>

          <p className="mt-2 text-xs text-gray-600">
            Save this key securely. It will not be shown again.
          </p>
        </div>
      )}

      <div className="mt-6">
        <h3 className="font-medium">Existing keys</h3>

        {loading ? (
          <p className="mt-3 text-sm text-gray-600">Loading API keys...</p>
        ) : keys.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">No API keys created yet.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="break-words font-medium">{key.name}</p>

                  <p className="mt-1 text-xs text-gray-500">
                    Created: {new Date(key.createdAt).toLocaleString()}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Last used:{" "}
                    {key.lastUsedAt
                      ? new Date(key.lastUsedAt).toLocaleString()
                      : "Never"}
                  </p>

                  <p className="mt-1 text-xs text-gray-600">
                    Status: {key.revokedAt ? "Revoked" : "Active"}
                  </p>
                </div>

                {!key.revokedAt && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void revokeKey(key.id)}
                    className="self-start rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 sm:self-center"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ApiKeysPanel;

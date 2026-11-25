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
    } else if (status === "unauthenticated") {
      setKeys([]);
      setLoading(false);
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not create API key.");
      }

      setNewKey(data.apiKey);
      setName("");
      setMessage("API key created successfully. Copy and save it now.");

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
      setError("");
    } catch {
      setError("Automatic copy failed. Select and copy the key manually.");
    }
  };

  return (
    <section className="min-w-0 space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E5F2E9] text-[#176C52]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="8" cy="15" r="4" />
              <path d="m10.85 12.15 8.65-8.65 2 2-2 2-2-2-2 2 2 2-3.8 3.8" />
            </svg>
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#142B27]">API Keys</h2>

            <p className="mt-1 text-sm leading-6 text-[#718078]">
              Create and manage API credentials for sending events to ATLAS.
            </p>
          </div>
        </div>

        <span className="w-fit rounded-full border border-[#D5E8D8] bg-[#F1F8EF] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#176C52]">
          Developer Tools
        </span>
      </div>

      {/* CREATE API KEY */}

      <div className="rounded-2xl border border-[#DCE8DD] bg-[#F8FAF4] p-4 sm:p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-[#142B27]">
            Generate New API Key
          </h3>

          <p className="mt-1 text-xs leading-5 text-[#829087]">
            Give your API key a recognizable name so you can identify it later.
          </p>
        </div>

        <form
          onSubmit={createKey}
          className="flex min-w-0 flex-col gap-3 sm:flex-row"
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            minLength={2}
            maxLength={100}
            required
            placeholder="e.g. Production Website"
            aria-label="API key name"
            disabled={busy || !activeTenantId}
            className="min-w-0 flex-1 rounded-xl border border-[#D5E1D5] bg-white px-4 py-3 text-sm text-[#263B32] outline-none transition placeholder:text-[#A0ACA2] focus:border-[#20B58A] focus:ring-2 focus:ring-[#20B58A]/15 disabled:cursor-not-allowed disabled:bg-[#F0F3ED]"
          />

          <button
            type="submit"
            disabled={busy || !activeTenantId}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#176C52] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#12563F] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Please wait...
              </>
            ) : (
              <>
                <span className="text-lg leading-none">+</span>
                Create API Key
              </>
            )}
          </button>
        </form>

        {!activeTenantId && (
          <p className="mt-3 text-xs text-[#A36D60]">
            Select an active organization before creating an API key.
          </p>
        )}
      </div>

      {/* ERROR MESSAGE */}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-[#F4D8D0] bg-[#FFF7F3] p-4"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFE8DF] text-sm font-bold text-[#B85D46]">
            !
          </span>

          <p className="break-words text-sm leading-6 text-[#A34F3B]">
            {error}
          </p>
        </div>
      )}

      {/* SUCCESS MESSAGE */}

      {message && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-[#CDE8D5] bg-[#F1FAF3] p-4"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#DDF2E2] text-sm font-bold text-[#176C52]">
            ✓
          </span>

          <p className="break-words text-sm leading-6 text-[#176C52]">
            {message}
          </p>
        </div>
      )}

      {/* NEW API KEY DISPLAY */}

      {newKey && (
        <div className="overflow-hidden rounded-2xl border border-[#CDE8D5] bg-white">
          <div className="flex items-center gap-3 border-b border-[#E2EEE3] bg-[#F1FAF3] p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#DDF2E2] text-[#176C52]">
              ✓
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#176C52]">
                Your New API Key
              </h3>

              <p className="mt-1 text-xs text-[#718078]">
                Your credential is ready.
              </p>
            </div>
          </div>

          <div className="space-y-3 p-4 sm:p-5">
            <div className="overflow-hidden rounded-xl border border-[#DCE8DD] bg-[#F8FAF4] p-3 sm:p-4">
              <p className="break-all font-mono text-xs leading-6 text-[#263B32] sm:text-sm">
                {newKey}
              </p>
            </div>

            <button
              type="button"
              onClick={copyKey}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#176C52] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#12563F] sm:w-auto"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="8" y="8" width="13" height="13" rx="2" />
                <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
              </svg>
              Copy API Key
            </button>

            <p className="text-xs leading-5 text-[#829087]">
              Security reminder: Save this key securely. It will not be shown
              again after you leave this screen.
            </p>
          </div>
        </div>
      )}

      {/* EXISTING API KEYS */}

      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-[#142B27]">
              Existing API Keys
            </h3>

            <p className="mt-1 text-xs text-[#829087]">
              M{"anage your organization's API credentials."}
            </p>
          </div>

          {!loading && (
            <span className="w-fit rounded-full border border-[#DCE8DD] bg-[#F8FAF4] px-3 py-1 text-xs font-semibold text-[#176C52]">
              {keys.length} {keys.length === 1 ? "Key" : "Keys"}
            </span>
          )}
        </div>

        {/* LOADING */}

        {loading ? (
          <div className="space-y-3" aria-label="Loading API keys">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-xl border border-[#DCE8DD] bg-white p-4 sm:p-5"
              >
                <div className="h-4 w-40 rounded bg-[#E8EEE7]" />
                <div className="mt-4 h-3 w-56 max-w-full rounded bg-[#F0F3ED]" />
                <div className="mt-3 h-3 w-44 max-w-full rounded bg-[#F0F3ED]" />
              </div>
            ))}
          </div>
        ) : keys.length === 0 ? (
          /* EMPTY STATE */

          <div className="rounded-2xl border border-dashed border-[#D5E1D5] bg-[#FAFBF7] px-4 py-10 text-center sm:py-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF3E9] text-xl text-[#176C52]">
              ⌘
            </div>

            <h4 className="mt-4 text-sm font-bold text-[#142B27]">
              No API Keys Yet
            </h4>

            <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[#829087]">
              Create your first API key to connect your application and start
              sending events to ATLAS.
            </p>
          </div>
        ) : (
          /* API KEY LIST */

          <div className="space-y-3">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex min-w-0 flex-col gap-4 rounded-xl border border-[#E3EBE2] bg-white p-4 transition hover:border-[#B9DCC7] hover:bg-[#FCFDF9] sm:p-5"
              >
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EAF3E9] text-[#176C52]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <circle cx="8" cy="15" r="4" />
                        <path d="m10.85 12.15 8.65-8.65" />
                      </svg>
                    </div>

                    <div className="min-w-0">
                      <p className="break-words text-sm font-bold text-[#263B32]">
                        {key.name}
                      </p>

                      <p className="mt-1 break-all text-[10px] text-[#A0ACA2]">
                        ID: {key.id}
                      </p>
                    </div>
                  </div>

                  {/* STATUS */}

                  <span
                    className={`w-fit shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      key.revokedAt
                        ? "border border-[#F4D8D0] bg-[#FFF7F3] text-[#B85D46]"
                        : "border border-[#CDE8D5] bg-[#F1FAF3] text-[#176C52]"
                    }`}
                  >
                    {key.revokedAt ? "Revoked" : "Active"}
                  </span>
                </div>

                {/* METADATA */}

                <div className="grid grid-cols-1 gap-3 border-t border-[#EDF1EB] pt-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A0ACA2]">
                      Created
                    </p>

                    <p className="mt-1 break-words text-xs font-medium text-[#52645A]">
                      {new Date(key.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A0ACA2]">
                      Last Used
                    </p>

                    <p className="mt-1 break-words text-xs font-medium text-[#52645A]">
                      {key.lastUsedAt
                        ? new Date(key.lastUsedAt).toLocaleString()
                        : "Never"}
                    </p>
                  </div>
                </div>

                {/* ACTION */}

                {!key.revokedAt && (
                  <div className="flex justify-start border-t border-[#EDF1EB] pt-3 sm:justify-end">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void revokeKey(key.id)}
                      className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[#F0D7D0] bg-white px-4 py-2 text-xs font-semibold text-[#B85D46] transition hover:bg-[#FFF3EE] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy ? "Please wait..." : "Revoke API Key"}
                    </button>
                  </div>
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

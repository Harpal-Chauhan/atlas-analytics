"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await signIn("credentials", {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        redirect: false,
      });

      if (!result || result.error) {
        setError("Invalid email or password.");
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setError("Unable to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#F5F6EF] px-4 py-6 sm:px-6 sm:py-8">
      {/* Background Decorations */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#D6F36A]/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-[#20B58A]/10 blur-3xl" />

      <div className="relative my-auto w-full max-w-lg">

        {/* Login Card */}
        <div className="overflow-hidden rounded-3xl border border-[#DCE8DD] bg-white shadow-[0_24px_70px_rgba(20,43,39,0.09)]">
          <div className="h-2 bg-gradient-to-r from-[#20B58A] via-[#D6F36A] to-[#FF896D]" />

          <div className="p-6 sm:p-6">
            {/* Heading */}

            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#142B27] sm:text-4xl">
              Welcome back
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#718078] sm:text-base">
              Log in to your ATLAS account and continue managing your product
              analytics.
            </p>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-[#142B27]"
                >
                  Email address
                </label>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <svg
                      className="h-5 w-5 text-[#829087]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.8}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 7.5 10.8 13a2 2 0 0 0 2.4 0L21 7.5M5.25 19.5h13.5A2.25 2.25 0 0 0 21 17.25v-10.5A2.25 2.25 0 0 0 18.75 4.5H5.25A2.25 2.25 0 0 0 3 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Z"
                      />
                    </svg>
                  </div>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    maxLength={254}
                    autoComplete="email"
                    placeholder="you@company.com"
                    className="w-full rounded-xl border border-[#DCE8DD] bg-[#F8FAF4] py-3.5 pl-11 pr-4 text-sm text-[#142B27] outline-none transition placeholder:text-[#A0AAA3] hover:border-[#B9DDC8] focus:border-[#20B58A] focus:bg-white focus:ring-4 focus:ring-[#20B58A]/10"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-[#142B27]"
                >
                  Password
                </label>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <svg
                      className="h-5 w-5 text-[#829087]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.8}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7.5 10.5V7.875a4.5 4.5 0 0 1 9 0V10.5m-10.5 0h12A2.25 2.25 0 0 1 20.25 12.75v6A2.25 2.25 0 0 1 18 21H6a2.25 2.25 0 0 1-2.25-2.25v-6A2.25 2.25 0 0 1 6 10.5Z"
                      />
                    </svg>
                  </div>

                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="Your password"
                    className="w-full rounded-xl border border-[#DCE8DD] bg-[#F8FAF4] py-3.5 pl-11 pr-4 text-sm text-[#142B27] outline-none transition placeholder:text-[#A0AAA3] hover:border-[#B9DDC8] focus:border-[#20B58A] focus:bg-white focus:ring-4 focus:ring-[#20B58A]/10"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="flex items-start gap-3 rounded-xl border border-[#FFD5C9] bg-[#FFF0EB] p-4 text-sm leading-6 text-[#B85D46]"
                >
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
                    <circle cx="12" cy="12" r="9" />
                  </svg>

                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#142B27] px-5 py-4 text-sm font-bold text-white shadow-lg shadow-[#142B27]/10 transition duration-200 hover:bg-[#176C52] focus:outline-none focus:ring-4 focus:ring-[#20B58A]/20 disabled:cursor-not-allowed disabled:opacity-60"
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
                    Logging in...
                  </>
                ) : (
                  <>
                    Log in to ATLAS
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
            </form>

            {/* Signup Link */}
            <div className="mt-7 border-t border-[#EAF0E9] pt-6">
              <p className="text-center text-sm text-[#718078]">
                {"Don't have an account?"}
                <Link
                  href="/signup"
                  className="font-bold text-[#176C52] underline-offset-4 transition hover:text-[#20B58A] hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-7 text-center text-xs text-[#829087]">
          Secure login powered by{" "}
          <span className="font-bold text-[#176C52]">ATLAS</span>
        </p>
      </div>
    </main>
  );
}

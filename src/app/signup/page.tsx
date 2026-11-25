"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setSuccess("");
    setLoading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      company: String(formData.get("company") ?? ""),
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data: { message?: string } = await response.json();

      if (!response.ok) {
        setError(data.message ?? "Signup failed. Please try again.");
        return;
      }

      setSuccess(
        data.message ??
          "Account created successfully. Your signup is complete.",
      );

      form.reset();
      router.push("/login");
    } catch {
      setError(
        "Unable to connect to the server. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex h-dvh w-full items-center justify-center overflow-hidden bg-[#F5F6EF] px-3 py-2 sm:px-5">
      {/* Background decorations */}
      <div className="pointer-events-none fixed -left-32 -top-32 h-72 w-72 rounded-full bg-[#D6F36A]/25 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-32 -right-32 h-72 w-72 rounded-full bg-[#20B58A]/10 blur-3xl" />

      {/* Main card */}
      <div className="relative grid max-h-full w-full max-w-4xl grid-cols-1 overflow-y-auto rounded-2xl border border-[#DCE8DD] bg-white shadow-[0_16px_50px_rgba(20,43,39,0.09)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid-cols-2">
        {/* Left branding panel */}
        <section className="relative hidden flex-col justify-between overflow-hidden bg-[#142B27] p-6 text-white lg:flex xl:p-7">
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full border-[32px] border-[#20B58A]/15" />
          <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-[#20B58A]/10 blur-2xl" />

          <div className="relative">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xl font-extrabold tracking-tight"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D6F36A] text-base font-black text-[#142B27]">
                A
              </span>
              ATLAS
            </Link>

            <div className="mt-10">
              <span className="rounded-full border border-[#D6F36A]/30 bg-[#D6F36A]/10 px-2.5 py-1 text-[9px] font-semibold tracking-wide text-[#D6F36A]">
                PRODUCT ANALYTICS PLATFORM
              </span>

              <h2 className="mt-5 max-w-xs text-3xl font-bold leading-tight">
                Turn your data into
                <span className="text-[#D6F36A]"> better decisions.</span>
              </h2>

              <p className="mt-3 max-w-xs text-xs leading-5 text-[#C1D0C7]">
                Understand user behavior, discover insights, and grow your
                product with powerful analytics.
              </p>
            </div>
          </div>

          <div className="relative mt-6 rounded-xl border border-white/10 bg-white/[0.06] p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[#DCE8DD]">
                Your analytics journey
              </p>
              <span className="rounded-full bg-[#D6F36A] px-2 py-1 text-[9px] font-bold text-[#142B27]">
                GET STARTED
              </span>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#20B58A]/20 text-[#6DE0B8]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4"
                >
                  <path d="M3 3v18h18" />
                  <path d="m7 14 4-4 4 3 6-7" />
                </svg>
              </div>

              <div>
                <p className="text-xs font-semibold">One workspace</p>
                <p className="mt-0.5 text-[10px] text-[#A9BDB2]">
                  All your product insights in one place
                </p>
              </div>
            </div>
          </div>

          <p className="relative mt-5 text-[10px] text-[#829087]">
            © {new Date().getFullYear()} ATLAS. All rights reserved.
          </p>
        </section>

        {/* Signup form */}
        <section className="flex items-center px-5 py-4 sm:px-8 sm:py-5 lg:px-8 lg:py-5">
          <div className="mx-auto w-full max-w-sm">
            {/* Mobile brand */}
            <Link
              href="/"
              className="mb-3 inline-flex items-center gap-2 text-base font-extrabold tracking-tight text-[#142B27] lg:hidden"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D6F36A] text-sm font-black">
                A
              </span>
              ATLAS
            </Link>

            {/* Heading */}
            <div>
              <span className="inline-flex items-center rounded-full bg-[#EAF3E9] px-2.5 py-1 text-[9px] font-semibold text-[#176C52]">
                CREATE YOUR ACCOUNT
              </span>

              <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#142B27]">
                Get started with ATLAS
              </h1>

              <p className="mt-1 text-xs leading-4 text-[#718078]">
                Create your workspace and start understanding your product
                analytics.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-4 space-y-2.5">
              <div>
                <label
                  htmlFor="company"
                  className="mb-1 block text-xs font-semibold text-[#142B27]"
                >
                  Company name
                </label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="organization"
                  placeholder="Your company"
                  className="w-full rounded-lg border border-[#DCE8DD] bg-[#F8FAF4] px-3 py-2 text-xs text-[#142B27] outline-none transition placeholder:text-[#9AA79F] focus:border-[#20B58A] focus:bg-white focus:ring-2 focus:ring-[#20B58A]/10"
                />
              </div>

              <div>
                <label
                  htmlFor="name"
                  className="mb-1 block text-xs font-semibold text-[#142B27]"
                >
                  Full name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  placeholder="Your name"
                  className="w-full rounded-lg border border-[#DCE8DD] bg-[#F8FAF4] px-3 py-2 text-xs text-[#142B27] outline-none transition placeholder:text-[#9AA79F] focus:border-[#20B58A] focus:bg-white focus:ring-2 focus:ring-[#20B58A]/10"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-xs font-semibold text-[#142B27]"
                >
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="w-full rounded-lg border border-[#DCE8DD] bg-[#F8FAF4] px-3 py-2 text-xs text-[#142B27] outline-none transition placeholder:text-[#9AA79F] focus:border-[#20B58A] focus:bg-white focus:ring-2 focus:ring-[#20B58A]/10"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1 block text-xs font-semibold text-[#142B27]"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className="w-full rounded-lg border border-[#DCE8DD] bg-[#F8FAF4] px-3 py-2 text-xs text-[#142B27] outline-none transition placeholder:text-[#9AA79F] focus:border-[#20B58A] focus:bg-white focus:ring-2 focus:ring-[#20B58A]/10"
                />
                <p className="mt-1 text-[10px] text-[#829087]">
                  Use 8–128 characters.
                </p>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-[#FF896D]/30 bg-[#FFF1EC] p-2.5 text-xs text-[#B85D46]"
                >
                  {error}
                </p>
              )}

              {success && (
                <p
                  role="status"
                  className="rounded-lg border border-[#20B58A]/20 bg-[#EAF3E9] p-2.5 text-xs text-[#176C52]"
                >
                  {success}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || Boolean(success)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#142B27] px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-[#142B27]/10 transition hover:bg-[#176C52] focus:outline-none focus:ring-2 focus:ring-[#20B58A]/20 disabled:cursor-not-allowed disabled:opacity-60"
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
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Creating account...
                  </>
                ) : success ? (
                  "Account created"
                ) : (
                  <>
                    Create account
                    <span aria-hidden="true">→</span>
                  </>
                )}
              </button>
            </form>

            {/* Login link */}
            <div className="my-3 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#E5ECE5]" />
              <span className="text-[9px] text-[#9AA79F]">
                ALREADY REGISTERED?
              </span>
              <div className="h-px flex-1 bg-[#E5ECE5]" />
            </div>

            <p className="text-center text-xs text-[#718078]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-[#176C52] underline decoration-[#20B58A]/40 underline-offset-4 transition hover:text-[#142B27]"
              >
                Log in
              </Link>
            </p>

            <p className="mt-3 text-center text-[9px] text-[#9AA79F] lg:hidden">
              © {new Date().getFullYear()} ATLAS. All rights reserved.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

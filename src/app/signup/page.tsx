"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const router = useRouter()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
      router.push("/login")
    } catch {
      setError(
        "Unable to connect to the server. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <Link href="/" className="text-2xl font-bold tracking-tight text-black">
          ATLAS
        </Link>

        <h1 className="mt-8 text-2xl font-bold text-gray-900">
          Create your account
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          Get started with ATLAS Product Analytics.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="company"
              className="mb-1 block text-sm font-medium text-gray-700"
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black outline-none focus:border-gray-500"
              placeholder="Your company"
            />
          </div>

          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium text-gray-700"
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black outline-none focus:border-gray-500"
              placeholder="Your name"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-gray-700"
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black outline-none focus:border-gray-500"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-gray-700"
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black outline-none focus:border-gray-500"
              placeholder="At least 8 characters"
            />
            <p className="mt-1 text-xs text-gray-500">Use 8–128 characters.</p>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {success && (
            <p
              role="status"
              className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
            >
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || Boolean(success)}
            className="w-full rounded-lg bg-gray-900 px-4 py-3 font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Creating account..."
              : success
                ? "Account created"
                : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-gray-900 underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";

export default function LoginPage() {
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

async function handleSubmit(event: FormEvent<HTMLFormElement>) {
event.preventDefault();
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
<main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
<div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
<Link href="/" className="text-2xl font-bold tracking-tight text-black">
ATLAS
</Link>

    <h1 className="mt-8 text-2xl font-bold text-gray-900">
      Welcome back
    </h1>

    <p className="mt-2 text-sm text-gray-600">
      Log in to your ATLAS account.
    </p>

    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
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
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black outline-none focus:border-gray-500"
          placeholder="Your password"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-gray-900 px-4 py-3 font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Logging in..." : "Log in"}
      </button>
    </form>

    <p className="mt-6 text-center text-sm text-gray-600">
      {`Don't have an account?`}
      <Link href="/signup" className="font-medium text-gray-900 underline">
        Sign up
      </Link>
    </p>
  </div>
</main>

);
}
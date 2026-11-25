"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F5F6EF] px-4 py-10 sm:px-6">
          {/* Background decoration */}
          <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#D6F36A]/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#20B58A]/15 blur-3xl" />

          <section className="relative w-full max-w-xl rounded-3xl border border-[#DCE8DD] bg-white px-6 py-10 text-center shadow-[0_24px_80px_rgba(20,43,39,0.10)] sm:px-12 sm:py-14">
            {/* ATLAS branding */}
            <div className="flex justify-center">
              <div className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-[#142B27]">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D6F36A] text-lg font-black">
                  A
                </span>
                ATLAS
              </div>
            </div>

            {/* Error icon */}
            <div className="mx-auto mt-10 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#FFF1EC]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#B85D46"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-10 w-10"
                aria-hidden="true"
              >
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
                <path d="M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3l-7.5-13.1a2 2 0 0 0-3.4 0Z" />
              </svg>
            </div>

            <span className="mt-7 inline-flex rounded-full bg-[#FFF1EC] px-3 py-1.5 text-xs font-semibold tracking-wide text-[#B85D46]">
              SYSTEM ERROR
            </span>

            <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#142B27] sm:text-4xl">
              Something went wrong
            </h1>

            <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#718078] sm:text-base">
              We encountered an unexpected problem while loading ATLAS. Your
              experience matters to us. Please try again.
            </p>

            {error.digest && (
              <p className="mt-5 rounded-xl border border-[#DCE8DD] bg-[#F8FAF4] px-4 py-3 text-xs text-[#829087]">
                Error reference:{" "}
                <span className="font-mono font-semibold text-[#176C52]">
                  {error.digest}
                </span>
              </p>
            )}

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#142B27] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#142B27]/10 transition hover:bg-[#176C52] focus:outline-none focus:ring-4 focus:ring-[#20B58A]/20 sm:w-auto sm:min-w-44"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M20 7v5h-5" />
                <path d="M4 17v-5h5" />
                <path d="M5.6 9a7 7 0 0 1 11.6-2L20 12" />
                <path d="M4 12l2.8 5a7 7 0 0 0 11.6-2" />
              </svg>
              Try again
            </button>

            <p className="mt-8 border-t border-[#E5ECE5] pt-6 text-xs text-[#9AA79F]">
              ATLAS Product Analytics · We are working to keep things running
              smoothly.
            </p>
          </section>
        </main>
      </body>
    </html>
  );
}

import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="flex items-center justify-between border-b bg-white px-6 py-4 sm:px-12">
        <Link href="/" className="text-xl font-bold tracking-tight">
          ATLAS
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Log in
          </Link>

          <Link
            href="/signup"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Get started
          </Link>
        </div>
      </nav>

      <section className="mx-auto flex min-h-[75vh] max-w-5xl flex-col items-center justify-center px-6 py-20 text-center">
        <p className="mb-4 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600">
          Product Analytics Platform
        </p>

        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Understand your product.
          <span className="block text-gray-500">
            Make better decisions.
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
          ATLAS helps teams collect product events and understand
          how users interact with their products.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="rounded-lg bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-700"
          >
            Create your account
          </Link>

          <Link
            href="/login"
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium hover:bg-gray-100"
          >
            Log in
          </Link>
        </div>
      </section>

      <footer className="border-t bg-white px-6 py-6 text-center text-sm text-gray-500">
        ATLAS Product Analytics
      </footer>
    </main>
  );
}

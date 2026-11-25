import Link from "next/link";

const features = [
  {
    number: "01",
    title: "Real-time Analytics",
    description:
      "Monitor incoming product events and understand user activity as it happens.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-6 w-6"
      >
        <path d="M3 3v18h18" />
        <path d="m7 14 4-4 4 3 6-7" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Understand Users",
    description:
      "Explore user behavior, engagement patterns, and the actions that matter.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-6 w-6"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Funnel & Retention",
    description:
      "Discover where users drop off and measure how well your product keeps them engaged.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-6 w-6"
      >
        <path d="M4 4h16l-6 7v6l-4 3v-9L4 4Z" />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Multi-tenant Workspace",
    description:
      "Manage organizations and keep workspace analytics separated with tenant-level isolation.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-6 w-6"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16M3 10h6M3 15h6" />
      </svg>
    ),
  },
];

const Home = () => {
  return (
    <main className="min-h-screen overflow-hidden bg-[#F5F6EF] text-[#142B27]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-[#DCE8DD] bg-[#F5F6EF]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D6F36A] text-lg font-black text-[#142B27]">
              A
            </span>
            <span className="text-2xl font-extrabold tracking-tight">
              ATLAS
            </span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-6">
            <Link
              href="/login"
              className="text-sm font-semibold text-[#718078] transition hover:text-[#142B27]"
            >
              Log in
            </Link>

            <Link
              href="/signup"
              className="rounded-xl bg-[#142B27] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#176C52] sm:px-5"
            >
              Get started
              <span className="ml-1.5" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-[#D6F36A]/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-40 top-72 h-[400px] w-[400px] rounded-full bg-[#20B58A]/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2 lg:px-8 lg:py-32">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#DCE8DD] bg-white/80 px-4 py-2 text-xs font-semibold tracking-wide text-[#176C52] shadow-sm sm:text-sm">
              <span className="h-2 w-2 rounded-full bg-[#20B58A]" />
              PRODUCT ANALYTICS PLATFORM
            </div>

            <h1 className="mt-7 max-w-2xl text-4xl font-extrabold leading-[1.12] tracking-tight text-[#142B27] sm:text-5xl lg:text-6xl xl:text-7xl">
              Understand your product.
              <span className="mt-2 block text-[#20B58A]">
                Make better decisions.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-8 text-[#718078] sm:text-lg">
              ATLAS helps teams collect product events, understand user
              behavior, measure engagement, and turn product data into
              meaningful insights.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#142B27] px-7 py-4 text-sm font-bold text-white shadow-xl shadow-[#142B27]/10 transition hover:-translate-y-0.5 hover:bg-[#176C52]"
              >
                Create your account
                <span aria-hidden="true">→</span>
              </Link>

              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-[#DCE8DD] bg-white px-7 py-4 text-sm font-bold text-[#142B27] transition hover:border-[#20B58A] hover:bg-[#EAF3E9]"
              >
                Log in to ATLAS
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 text-xs font-medium text-[#829087] sm:text-sm">
              <span className="flex items-center gap-2">
                <span className="text-[#20B58A]">✓</span>
                Real-time activity
              </span>
              <span className="flex items-center gap-2">
                <span className="text-[#20B58A]">✓</span>
                Multi-tenant analytics
              </span>
              <span className="flex items-center gap-2">
                <span className="text-[#20B58A]">✓</span>
                Product insights
              </span>
            </div>
          </div>

          {/* Analytics preview illustration */}
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -right-5 -top-5 h-32 w-32 rounded-full bg-[#D6F36A]/50 blur-2xl" />

            <div className="relative rounded-3xl border border-[#DCE8DD] bg-white p-4 shadow-[0_30px_90px_rgba(20,43,39,0.12)] sm:p-6">
              <div className="flex items-center justify-between gap-3 border-b border-[#EAF0E9] pb-5">
                <div>
                  <p className="text-sm font-bold text-[#142B27]">
                    Analytics Overview
                  </p>
                  <p className="mt-1 text-xs text-[#829087]">
                    Product performance snapshot
                  </p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-[#EAF3E9] px-3 py-1.5 text-[10px] font-bold text-[#176C52] sm:text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#20B58A]" />
                  LIVE PREVIEW
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#F8FAF4] p-4">
                  <p className="text-xs font-medium text-[#829087]">
                    Total Events
                  </p>
                  <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#142B27] sm:text-3xl">
                    Analytics
                  </p>
                  <p className="mt-1 text-xs text-[#176C52]">Event tracking</p>
                </div>

                <div className="rounded-2xl bg-[#EAF3E9] p-4">
                  <p className="text-xs font-medium text-[#718078]">
                    User Activity
                  </p>
                  <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#176C52] sm:text-3xl">
                    Live
                  </p>
                  <p className="mt-1 text-xs text-[#176C52]">
                    Real-time monitoring
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-[#EAF0E9] p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#142B27]">
                      Activity Trends
                    </p>
                    <p className="mt-1 text-xs text-[#829087]">
                      Example analytics visualization
                    </p>
                  </div>
                  <span className="rounded-lg bg-[#F8FAF4] px-2.5 py-1.5 text-xs font-semibold text-[#176C52]">
                    Overview
                  </span>
                </div>

                <div className="mt-6 flex h-36 items-end gap-2 sm:h-44 sm:gap-3">
                  {[36, 54, 43, 70, 58, 82, 66, 92, 73, 100, 78, 88].map(
                    (height, index) => (
                      <div
                        key={index}
                        className="flex flex-1 items-end"
                        style={{ height: "100%" }}
                      >
                        <div
                          className={`w-full rounded-t-md ${
                            index === 9
                              ? "bg-[#20B58A]"
                              : index === 7
                                ? "bg-[#D6F36A]"
                                : "bg-[#DCE8DD]"
                          }`}
                          style={{ height: `${height}%` }}
                        />
                      </div>
                    ),
                  )}
                </div>

                <div className="mt-3 flex justify-between text-[10px] text-[#9AA79F]">
                  <span>Start</span>
                  <span>Activity</span>
                  <span>Latest</span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#142B27] p-4 text-white">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D6F36A] text-[#142B27]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-5 w-5"
                  >
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    Insights in one workspace
                  </p>
                  <p className="mt-1 text-xs text-[#B9CCC1]">
                    Track. Analyze. Improve.
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 -left-5 -z-10 h-32 w-32 rounded-full bg-[#20B58A]/20 blur-2xl" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-[#DCE8DD] bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold tracking-[0.2em] text-[#20B58A]">
              BUILT FOR PRODUCT TEAMS
            </span>

            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#142B27] sm:text-4xl">
              Everything you need to understand your product
            </h2>

            <p className="mt-4 text-sm leading-7 text-[#718078] sm:text-base">
              Bring your product analytics into one organized workspace and make
              informed decisions with meaningful data.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <article
                key={feature.number}
                className="group rounded-2xl border border-[#DCE8DD] bg-[#F8FAF4] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#20B58A]/50 hover:bg-white hover:shadow-xl hover:shadow-[#142B27]/5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF3E9] text-[#176C52] transition group-hover:bg-[#D6F36A]">
                    {feature.icon}
                  </div>
                  <span className="text-xs font-bold text-[#A6B5A9]">
                    {feature.number}
                  </span>
                </div>

                <h3 className="mt-6 text-lg font-bold text-[#142B27]">
                  {feature.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-[#718078]">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#142B27] px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex rounded-full border border-[#D6F36A]/25 bg-[#D6F36A]/10 px-4 py-2 text-xs font-semibold tracking-wide text-[#D6F36A]">
            START WITH ATLAS
          </span>

          <h2 className="mt-6 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Make every product decision
            <span className="block text-[#D6F36A]">more meaningful.</span>
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#B9CCC1] sm:text-base">
            Create your ATLAS workspace and bring your product data, analytics,
            and insights together.
          </p>

          <Link
            href="/signup"
            className="mt-9 inline-flex items-center justify-center gap-2 rounded-xl bg-[#D6F36A] px-7 py-4 text-sm font-bold text-[#142B27] transition hover:-translate-y-0.5 hover:bg-[#E4FA88]"
          >
            Get started with ATLAS
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#DCE8DD] bg-[#F5F6EF] px-4 py-7 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D6F36A] text-sm font-black text-[#142B27]">
              A
            </span>
            <span className="font-extrabold tracking-tight text-[#142B27]">
              ATLAS
            </span>
          </Link>

          <p className="text-xs text-[#829087] sm:text-sm">
            © {new Date().getFullYear()} ATLAS Product Analytics. All rights
            reserved.
          </p>

          <div className="flex items-center gap-5 text-xs font-semibold text-[#718078] sm:text-sm">
            <Link href="/login" className="transition hover:text-[#176C52]">
              Log in
            </Link>
            <Link href="/signup" className="transition hover:text-[#176C52]">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Home;

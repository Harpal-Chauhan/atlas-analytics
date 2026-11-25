"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent,
} from "react";

type DashboardShellProps = {
  userName: string;
  userInitial: string;
  children: ReactNode;
  logoutAction: () => Promise<void>;
};

const navItems = [
  { label: "Overview", href: "#overview", number: "01" },
  { label: "Organizations", href: "#organizations", number: "02" },
  { label: "Developer Settings", href: "#api-keys", number: "03" },
  { label: "Analytics", href: "#analytics", number: "04" },
];

const sectionIds = navItems.map((item) => item.href.slice(1));

export default function DashboardShell({
  userName,
  userInitial,
  children,
  logoutAction,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("#overview");

  const pendingNavigation = useRef<string | null>(null);
  const ticking = useRef(false);

  const updateActiveSection = useCallback(() => {
    if (pendingNavigation.current) return;

    const activationPoint = 150;
    let currentSection = "#overview";
    let closestTop = Number.NEGATIVE_INFINITY;

    for (const id of sectionIds) {
      const section = document.getElementById(id);

      if (!section) continue;

      const top = section.getBoundingClientRect().top;

      if (top <= activationPoint && top > closestTop) {
        closestTop = top;
        currentSection = `#${id}`;
      }
    }

    const isAtBottom =
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 5;

    if (isAtBottom) {
      currentSection = "#analytics";
    }

    setActiveSection(currentSection);
  }, []);

  useEffect(() => {
    let scrollEndTimer: ReturnType<typeof setTimeout> | undefined;

    const handleScrollEnd = () => {
      if (scrollEndTimer) {
        clearTimeout(scrollEndTimer);
        scrollEndTimer = undefined;
      }

      const destination = pendingNavigation.current;
      pendingNavigation.current = null;

      if (destination) {
        setActiveSection(destination);
      } else {
        updateActiveSection();
      }
    };

    const handleScroll = () => {
      if (!ticking.current) {
        ticking.current = true;

        window.requestAnimationFrame(() => {
          if (!pendingNavigation.current) {
            updateActiveSection();
          }

          ticking.current = false;
        });
      }

      // Fallback for browsers without scrollend support.
      if (scrollEndTimer) {
        clearTimeout(scrollEndTimer);
      }

      scrollEndTimer = setTimeout(handleScrollEnd, 180);
    };

    const handleManualScroll = () => {
      if (pendingNavigation.current) {
        pendingNavigation.current = null;
        updateActiveSection();
      }
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    window.addEventListener("scrollend", handleScrollEnd);
    window.addEventListener("resize", updateActiveSection);

    window.addEventListener("wheel", handleManualScroll, {
      passive: true,
    });

    window.addEventListener("touchstart", handleManualScroll, {
      passive: true,
    });

    updateActiveSection();

    return () => {
      if (scrollEndTimer) {
        clearTimeout(scrollEndTimer);
      }

      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scrollend", handleScrollEnd);
      window.removeEventListener("resize", updateActiveSection);
      window.removeEventListener("wheel", handleManualScroll);
      window.removeEventListener("touchstart", handleManualScroll);
    };
  }, [updateActiveSection]);

  const handleNavigation = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    event.preventDefault();

    const targetId = href.slice(1);
    const target = document.getElementById(targetId);

    if (!target) return;

    if (targetId === "overview") {
      pendingNavigation.current = href;
      setActiveSection(href);
      setSidebarOpen(false);

      window.history.replaceState(null, "", href);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    pendingNavigation.current = href;
    setActiveSection(href);
    setSidebarOpen(false);

    window.history.replaceState(null, "", href);

    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="min-h-screen bg-[#F5F6EF] text-[#142B27]">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-[#142B27]/50 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[270px] flex-col overflow-hidden bg-[#142B27] text-white transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex h-[82px] shrink-0 items-center justify-between border-b border-white/10 px-6">
          <Link
            href="#overview"
            onClick={(event) => handleNavigation(event, "#overview")}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D6F36A] text-lg font-black text-[#142B27]">
              A
            </div>

            <div>
              <h1 className="text-xl font-extrabold tracking-[0.16em]">
                ATLAS
              </h1>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/50">
                Product Analytics
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            className="rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden"
          >
            ✕
          </button>
        </div>

        {/* Navigation */}
        <div className="min-h-0 flex-1 overflow-hidden px-4 py-7">
          <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
            Workspace
          </p>

          <nav className="space-y-2" aria-label="Dashboard navigation">
            {navItems.map((item) => {
              const isActive = activeSection === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(event) => handleNavigation(event, item.href)}
                  aria-current={isActive ? "location" : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors duration-200 ${
                    isActive
                      ? "bg-[#D6F36A] text-[#142B27] shadow-lg shadow-black/10"
                      : "text-white/65 hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                      isActive
                        ? "bg-[#142B27]/10 text-[#142B27]"
                        : "bg-white/10 text-white/55 group-hover:bg-white/15"
                    }`}
                  >
                    {item.number}
                  </span>

                  <span className="flex-1 text-sm font-semibold">
                    {item.label}
                  </span>

                  {isActive && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#20B58A]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="shrink-0 border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.06] p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#20B58A] font-bold text-white">
              {userInitial}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {userName}
              </p>
              <p className="text-xs text-white/45">Workspace Member</p>
            </div>
          </div>

          <form action={logoutAction} className="mt-3">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/60 transition hover:bg-[#FF896D]/10 hover:text-[#FF896D]"
            >
              <span className="text-lg">↪</span>
              Sign Out
            </button>
          </form>

          <p className="mt-3 text-center text-[10px] text-white/30">
            ATLAS Analytics Platform
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="min-h-screen lg:pl-[270px]">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-[#DCE8DD] bg-[#F8FAF4]/90 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DCE8DD] bg-white text-[#142B27] transition hover:bg-[#EAF3E9] lg:hidden"
            >
              ☰
            </button>

            <div>
              <p className="text-xs font-medium text-[#829087]">
                Workspace / Dashboard
              </p>
              <h2 className="text-lg font-bold text-[#142B27]">Dashboard</h2>
            </div>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <div className="h-2 w-2 rounded-full bg-[#20B58A]" />
            <span className="text-xs font-semibold text-[#718078]">
              All systems operational
            </span>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF3E9] font-bold text-[#176C52] sm:hidden">
            {userInitial}
          </div>
        </header>

        {/* Page Content */}
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-8 sm:py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-[#DCE8DD] px-5 py-6 sm:px-8">
          <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-2 text-xs text-[#829087] sm:flex-row">
            <p>© {new Date().getFullYear()} ATLAS Analytics.</p>
            <p>Built for better product decisions.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

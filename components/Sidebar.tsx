"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { AppUser } from "@/lib/auth/types";

type NavItem = { label: string; href: string };
type NavGroup = { label: string; items: NavItem[] };

/**
 * Grouped by when you reach for it rather than by subsystem: the rituals
 * that run every day, the things that move over a quarter, the record you
 * read back, and everything else.
 *
 * /protocols has no index route, only /protocols/[slug], so it is reached
 * from Today and from Insights rather than from here.
 */
const NAV: NavGroup[] = [
  {
    label: "The day",
    items: [
      { label: "Today", href: "/" },
      { label: "Morning", href: "/morning" },
      { label: "Evening", href: "/evening" },
      { label: "Focus", href: "/focus" },
      { label: "Habits", href: "/habits" },
      { label: "Discipline", href: "/discipline" },
    ],
  },
  {
    label: "The long arc",
    items: [
      { label: "Quests", href: "/quests" },
      { label: "Compass", href: "/compass" },
      { label: "Identity", href: "/identity" },
      { label: "Future", href: "/future" },
      { label: "Ideal week", href: "/week" },
    ],
  },
  {
    label: "Looking back",
    items: [
      { label: "Journal", href: "/journal" },
      { label: "Weekly review", href: "/weekly-review" },
      { label: "Insights", href: "/insights" },
    ],
  },
  {
    label: "Elsewhere",
    items: [
      { label: "Coach", href: "/coach" },
      { label: "Settings", href: "/settings" },
    ],
  },
];

const SIGN_IN_URL = "/pick-profile";

function dayOfYear(d: Date) {
  return Math.floor(
    (d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 864e5,
  );
}

/**
 * On a desk the rail runs down the left edge. On a phone it folds into a
 * strip across the top with a Menu key; the sections drop down from it
 * and close again as soon as a route is chosen. Without this the rail
 * took 232 of a phone's 390 pixels and the pages rendered in the rest.
 */
export function Sidebar({ user }: { user: AppUser | null }) {
  const pathname = usePathname();
  const [day, setDay] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  // Rendered after mount so the server and client never disagree about
  // the date, which would otherwise hydrate-mismatch across midnight.
  useEffect(() => setDay(dayOfYear(new Date())), []);

  // A chosen route closes the menu.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <aside className="relative z-40 shrink-0 bg-ink-950 border-b-[1.5px] border-ink-50 md:border-b-0 md:border-r-[1.5px] md:w-[232px] md:flex md:flex-col md:sticky md:top-0 md:h-screen md:overflow-y-auto">
      <div className="flex items-center justify-between gap-3 px-[18px] py-3 md:block md:pt-[22px] md:pb-[18px] md:border-b-[1.5px] md:border-ink-50">
        <div>
          <div
            className="text-[22px] md:text-[27px] leading-[0.92] tracking-[-0.035em]"
            style={{ fontVariationSettings: "'wdth' 88, 'wght' 800" }}
          >
            LifeOS
          </div>
          <div className="text-[11px] text-ink-300 mt-1 tabular-nums">
            {day === null ? " " : `Day ${day} of ${new Date().getFullYear()}`}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="rail-sections"
          className={`btn btn-sm md:hidden ${open ? "" : "btn-ghost"}`}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      <div
        id="rail-sections"
        className={`${
          open ? "flex" : "hidden"
        } md:flex flex-col absolute md:static left-0 right-0 top-full max-h-[calc(100vh-64px)] md:max-h-none overflow-y-auto md:overflow-visible bg-ink-950 border-b-[1.5px] border-ink-50 md:border-b-0 md:flex-1`}
      >
        <nav className="flex-1 py-3.5" aria-label="Sections">
          {NAV.map((group) => (
            <div key={group.label} className="mb-4">
              <div
                className="text-[11px] text-ink-400 px-[18px] pb-1.5"
                style={{ fontVariationSettings: "'wdth' 100, 'wght' 640" }}
              >
                {group.label}
              </div>
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} />
              ))}
            </div>
          ))}
        </nav>

        <div className="px-[18px] pt-3.5 pb-4 border-t-[1.5px] border-ink-50 flex flex-col gap-3">
          <ThemeToggle />
          {user ? (
            <Link
              href={SIGN_IN_URL}
              className="flex items-center gap-2.5 group"
              title="Switch profile"
            >
              <span
                className="w-[30px] h-[30px] shrink-0 grid place-items-center bg-accent-spot text-white text-sm"
                style={{ fontVariationSettings: "'wdth' 100, 'wght' 800" }}
              >
                {user.name?.[0]?.toUpperCase() ?? "?"}
              </span>
              <span className="flex-1 min-w-0">
                <span
                  className="block text-[13.5px] truncate"
                  style={{ fontVariationSettings: "'wght' 650" }}
                >
                  {user.name}
                </span>
                <span className="block text-[11px] text-ink-400 group-hover:text-accent-spot">
                  Switch profile
                </span>
              </span>
            </Link>
          ) : (
            <Link href={SIGN_IN_URL} className="btn btn-sm w-full text-center">
              Pick a profile
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  // Exact match, or a match on a path segment, so /journal/past keeps
  // Journal lit but /weekly-review does not light Ideal week (/week). The
  // old component had this pinned to false, so nothing in the rail has
  // ever shown where you are.
  const active =
    pathname === item.href ||
    (item.href !== "/" && pathname.startsWith(item.href + "/"));

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2.5 w-full px-[18px] py-[7px] text-[14.5px] border-l-[3px] ${
        active
          ? "bg-ink-50 text-ink-900 border-l-accent-spot"
          : "border-l-transparent text-ink-300 hover:bg-ink-800 hover:text-ink-50"
      }`}
      style={{ fontVariationSettings: active ? "'wght' 700" : "'wght' 550" }}
    >
      {item.label}
    </Link>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"day" | "night">("day");

  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    if (t === "night" || t === "day") setTheme(t);
  }, []);

  function flip() {
    const next = theme === "day" ? "night" : "day";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("lifeos-theme", next);
    } catch {
      // private mode, or storage disabled. The flip still holds for this
      // session; it just will not be remembered.
    }
  }

  return (
    <button
      onClick={flip}
      className="btn btn-ghost btn-sm w-full"
      aria-label={theme === "day" ? "Switch to night" : "Switch to day"}
    >
      {theme === "day" ? "Night" : "Day"}
    </button>
  );
}

import Link from "next/link";
import type { AppUser } from "@/lib/auth/types";

type NavItem = {
  label: string;
  href: string;
  comingIn?: string; // Phase number — non-functional links get dimmed
  badge?: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV: NavGroup[] = [
  {
    label: "Command Center",
    items: [
      { label: "Today", href: "/" },
      { label: "AI Coach", href: "/coach" },
    ],
  },
  {
    label: "Vision",
    items: [
      { label: "Quests", href: "/quests" },
      { label: "Compass", href: "/compass" },
      { label: "Future", href: "/future" },
      { label: "Ideal Week", href: "/week" },
    ],
  },
  {
    label: "Daily",
    items: [
      { label: "Morning", href: "/morning" },
      { label: "Evening", href: "/evening" },
      { label: "Focus", href: "/focus" },
      { label: "Habits", href: "/habits" },
    ],
  },
  {
    label: "Reflection",
    items: [
      { label: "Identity", href: "/identity" },
      { label: "Journal", href: "/journal", badge: "NEW" },
      { label: "Discipline", href: "/discipline" },
      { label: "Insights", href: "/insights" },
    ],
  },
  {
    label: "System",
    items: [{ label: "Settings", href: "/settings" }],
  },
];

const SIGN_IN_URL = "/pick-profile";

export function Sidebar({ user }: { user: AppUser | null }) {
  return (
    <aside className="w-64 shrink-0 border-r border-white/5 bg-ink-900 px-5 py-6 flex flex-col gap-7">
      <div>
        <div className="font-serif text-2xl tracking-tight">LifeOS</div>
        <div className="text-[11px] text-ink-300 mt-0.5">
          Daily companion · v0.1
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-5 text-sm">
        {NAV.map((group) => (
          <div key={group.label}>
            <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400 mb-2 px-2">
              {group.label}
            </div>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/5 pt-4">
        {user ? (
          <Link
            href={SIGN_IN_URL}
            className="flex items-center gap-3 hover:bg-white/5 rounded-lg p-2 -m-2 transition"
            title="Switch profile"
          >
            <div className="w-8 h-8 rounded-full bg-accent-violet/30 grid place-items-center text-xs font-medium text-accent-violet">
              {user.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{user.name}</div>
              <div className="text-[11px] text-ink-400 truncate">
                Switch profile →
              </div>
            </div>
          </Link>
        ) : (
          <Link
            href={SIGN_IN_URL}
            className="block text-center text-xs px-3 py-2 rounded-lg bg-accent-green/10 text-accent-green hover:bg-accent-green/20 transition"
          >
            Pick a profile
          </Link>
        )}
      </div>
    </aside>
  );
}

function NavLink({ item }: { item: NavItem }) {
  const isActive = false; // Phase 1: hardcoded. Phase 2 wires up usePathname().
  const isDisabled = Boolean(item.comingIn);

  const baseClass =
    "flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-sm transition";

  if (isDisabled) {
    return (
      <div
        className={`${baseClass} text-ink-400 cursor-not-allowed`}
        title={`Available in ${item.comingIn}`}
      >
        <span className="flex items-center gap-2">
          {item.label}
          {item.badge && (
            <span className="text-[9px] font-semibold uppercase tracking-wider text-accent-gold/80">
              {item.badge}
            </span>
          )}
        </span>
        <span className="text-[10px] text-ink-500">{item.comingIn}</span>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={`${baseClass} ${
        isActive
          ? "bg-white/5 text-ink-50"
          : "text-ink-200 hover:bg-white/5 hover:text-ink-50"
      }`}
    >
      <span>{item.label}</span>
    </Link>
  );
}

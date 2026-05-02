import Link from "next/link";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { RitualDepthToggle } from "@/components/settings/RitualDepthToggle";

const EC_URL =
  process.env.NEXT_PUBLIC_EC_URL?.trim() ||
  "https://app.evergreenwellnessmktg.com";

export default async function SettingsPage() {
  const { user } = await requireUserContext();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="text-xs text-ink-400 hover:text-ink-100 transition"
        >
          ← Today
        </Link>
        <div className="text-xs text-ink-400 uppercase tracking-[0.18em]">
          Settings
        </div>
      </div>

      <h1 className="font-serif text-3xl text-ink-50 mb-1">Settings</h1>
      <p className="text-sm text-ink-300 mb-8">
        Tune how LifeOS shows up in your day.
      </p>

      <Section title="You">
        <div className="card">
          <div className="card-glow" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-accent-violet/30 grid place-items-center text-lg font-medium text-accent-violet">
              {user.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base text-ink-100">{user.name}</div>
              <div className="text-sm text-ink-400 truncate">{user.email}</div>
            </div>
            <Link
              href={EC_URL}
              className="text-xs text-ink-400 hover:text-ink-100 transition shrink-0"
            >
              Manage in EC →
            </Link>
          </div>
          <p className="text-[11px] text-ink-400 mt-4 leading-relaxed">
            Your account lives in Evergreen Core. LifeOS reads the same
            session — sign in or out over there and this app follows.
          </p>
        </div>
      </Section>

      <Section
        title="Ritual depth"
        subtitle="Default depth for the morning + evening wizards."
      >
        <RitualDepthToggle />
      </Section>

      <Section
        title="Data"
        subtitle="Migrate from a previous LifeOS install."
      >
        <div className="card">
          <div className="card-glow" />
          <div className="font-serif text-base text-ink-100 mb-1">
            Import from v3
          </div>
          <p className="text-xs text-ink-300 leading-relaxed mb-3">
            Have a JSON export from the standalone v3 build? POST it to{" "}
            <code className="text-accent-sky bg-ink-700 px-1.5 py-0.5 rounded text-[11px]">
              /api/import-v3
            </code>{" "}
            with your session cookie. The endpoint upserts entries by date —
            morning and evening jsonb fields are passed through as-is.
          </p>
          <details className="text-[11px] text-ink-400">
            <summary className="cursor-pointer hover:text-ink-200">
              Example curl
            </summary>
            <pre className="mt-2 p-3 bg-ink-700 rounded text-[10px] overflow-x-auto leading-relaxed">{`curl -X POST http://localhost:3001/api/import-v3 \\
  -H "Content-Type: application/json" \\
  --cookie "$(cat ~/lifeos.cookie)" \\
  -d @v3-export.json`}</pre>
          </details>
        </div>
      </Section>

      <Section title="About">
        <div className="card">
          <div className="card-glow" />
          <div className="text-sm text-ink-200 space-y-1">
            <div>
              <span className="text-ink-400">Build:</span> Phase 2 · v0.2
            </div>
            <div>
              <span className="text-ink-400">Database:</span> Shared with
              Evergreen Core (M90t Postgres)
            </div>
            <div>
              <span className="text-ink-400">Auth:</span> Better Auth · shared
              session
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3">
        <h2 className="text-xs uppercase tracking-[0.18em] text-ink-400">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-ink-300 mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

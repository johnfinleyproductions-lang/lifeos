import Link from "next/link";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { RitualDepthToggle } from "@/components/settings/RitualDepthToggle";
import { FieldMarksToggle } from "@/components/settings/FieldMarksToggle";
import { PageStamp } from "@/components/PageStamp";

const EC_URL =
  process.env.NEXT_PUBLIC_EC_URL?.trim() ||
  "https://app.evergreenwellnessmktg.com";

export default async function SettingsPage() {
  const { user } = await requireUserContext();

  return (
    <div className="max-w-2xl mx-auto">
      <PageStamp
        title="Settings"
        subtitle="Tune how LifeOS shows up in your day."
      />

      <Section title="You">
        <div className="sheet">
          <div className="flex items-center gap-4">
            <span
              className="w-12 h-12 shrink-0 grid place-items-center bg-accent-spot text-white text-[22px]"
              style={{ fontVariationSettings: "'wdth' 100, 'wght' 800" }}
            >
              {user.name?.[0]?.toUpperCase() ?? "?"}
            </span>
            <div className="flex-1 min-w-0">
              <div
                className="text-[16px]"
                style={{ fontVariationSettings: "'wght' 700" }}
              >
                {user.name}
              </div>
              <div className="text-[13px] text-ink-400 truncate">
                {user.email}
              </div>
            </div>
            <Link href={EC_URL} className="btn btn-sm btn-ghost shrink-0">
              Manage in EC
            </Link>
          </div>
          <p className="text-[12.5px] text-ink-400 mt-4 mb-0 leading-relaxed">
            Your account lives in Evergreen Core. LifeOS reads the same session:
            sign in or out over there and this app follows.
          </p>
        </div>
      </Section>

      <Section
        title="Ritual depth"
        subtitle="Default depth for the morning and evening wizards."
      >
        <RitualDepthToggle />
      </Section>

      <Section
        title="Field marks"
        subtitle="The collection's small notes around the app. Nothing here is a target, and hiding them loses nothing."
      >
        <FieldMarksToggle />
      </Section>

      <Section title="Data" subtitle="Migrate from a previous LifeOS install.">
        <div className="sheet">
          <div className="t-h2 mb-1.5">Import from v3</div>
          <p className="text-[13.5px] text-ink-300 leading-relaxed mb-3">
            Have a JSON export from the standalone v3 build? POST it to{" "}
            <code className="font-mono text-[12px] bg-ink-700 border border-ink-500 px-1.5 py-0.5">
              /api/import-v3
            </code>{" "}
            with your session cookie. The endpoint upserts entries by date; the
            morning and evening jsonb fields pass through as they are.
          </p>
          <details className="text-[12px] text-ink-400">
            <summary className="cursor-pointer hover:text-ink-100">
              Example curl
            </summary>
            <pre className="mt-2 p-3 bg-ink-700 border border-ink-500 font-mono text-[11px] overflow-x-auto leading-relaxed">{`curl -X POST http://localhost:3001/api/import-v3 \\
  -H "Content-Type: application/json" \\
  --cookie "$(cat ~/lifeos.cookie)" \\
  -d @v3-export.json`}</pre>
          </details>
        </div>
      </Section>

      <Section title="About">
        <div className="sheet py-1">
          <Row label="Build" value="Phase 2, v0.2" />
          <Row
            label="Database"
            value="Shared with Evergreen Core (M90t Postgres)"
          />
          <Row label="Auth" value="Better Auth, shared session" />
        </div>
      </Section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3.5 py-2.5 border-b border-ink-600 last:border-b-0">
      <span
        className="shrink-0 w-[84px] text-[11.5px] text-ink-400 pt-[2px]"
        style={{ fontVariationSettings: "'wdth' 100, 'wght' 680" }}
      >
        {label}
      </span>
      <span className="flex-1 text-[14px]">{value}</span>
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
      <div className="tab-row">
        <span className="tab">{title}</span>
        <span className="fill" />
      </div>
      {subtitle && (
        <p className="text-[13.5px] text-ink-300 -mt-1.5 mb-3.5">{subtitle}</p>
      )}
      {children}
    </section>
  );
}

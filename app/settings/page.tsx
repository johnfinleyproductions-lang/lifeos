import Link from "next/link";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { FieldMarksToggle } from "@/components/settings/FieldMarksToggle";
import { PageStamp } from "@/components/PageStamp";
import { ThemeChoice } from "./ThemeChoice";
import { Reminders } from "@/components/settings/Reminders";

/**
 * What a person, not a developer, might want to tune. The account block
 * that pointed at Evergreen Core, the curl example for the v3 import and
 * the build row are gone: the app is standalone now and none of it was a
 * setting. Ritual depth is gone too; it is chosen on the wizard's first
 * card and remembered there.
 */
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
            <Link
              href="/pick-profile"
              className="btn btn-sm btn-ghost shrink-0 min-h-9"
            >
              Switch profile
            </Link>
          </div>
        </div>
      </Section>

      <Section title="The day">
        <div className="sheet">
          <p className="t-read m-0">
            The day starts at 4 am. Anything written before then, an evening
            shutdown at half past midnight for instance, files under the day
            that is ending, not the one about to begin.
          </p>
        </div>
      </Section>

      <Section
        title="Reminders"
        subtitle="A nudge for the morning page and the evening page, through the calendar you already use, so it reaches your phone, your watch and your Mac."
      >
        <Reminders />
      </Section>

      <Section
        title="Theme"
        subtitle="Day or night stock. Everyone starts on day; the switch at the foot of the rail does the same thing."
      >
        <ThemeChoice />
      </Section>

      <Section
        title="Field marks"
        subtitle="The collection's small notes around the app. Nothing here is a target, and hiding them loses nothing."
      >
        <FieldMarksToggle />
      </Section>

      <Section
        title="Your data"
        subtitle="Everything you have written here is yours to take. Both files hold your journal, so keep them somewhere private."
      >
        <div className="sheet">
          <div className="flex flex-wrap gap-3">
            <a className="btn" href="/api/export?format=md" download>
              Download to read
            </a>
            <a className="btn btn-ghost" href="/api/export?format=json" download>
              Download the full record
            </a>
          </div>
          <p className="mt-4 mb-0 text-[13.5px] text-ink-300 max-w-[62ch]">
            The first is one document you can open in any text editor or print: journal, days,
            habits, focus, quests and compass. The second is every row exactly as stored, for a
            backup or for moving to another tool.
          </p>
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

import Link from "next/link";
import { format } from "date-fns";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { JournalEditor } from "@/components/journal/JournalEditor";

export default async function JournalPage() {
  await requireUserContext();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="text-xs text-ink-400 hover:text-ink-100 transition"
        >
          ← Today
        </Link>
        <div className="text-xs text-ink-400 uppercase tracking-[0.18em]">
          {format(new Date(), "EEEE · MMMM d")}
        </div>
      </div>

      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl text-ink-50 mb-1">Journal</h1>
          <p className="text-sm text-ink-300">
            Private writing space. Stays here.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/journal/past"
            className="text-xs text-ink-400 hover:text-ink-100 transition"
          >
            Past entries →
          </Link>
          <Link
            href="/journal/decisions"
            className="text-xs text-ink-400 hover:text-ink-100 transition"
          >
            Decisions log →
          </Link>
        </div>
      </div>

      <JournalEditor />
    </div>
  );
}

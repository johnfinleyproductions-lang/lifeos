import Link from "next/link";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { JournalEditor } from "@/components/journal/JournalEditor";
import { PageStamp } from "@/components/PageStamp";

export default async function JournalPage() {
  await requireUserContext();

  return (
    <div className="max-w-3xl mx-auto">
      <PageStamp
        title="Journal"
        subtitle="Private writing space. Stays here."
        right={
          <>
            <Link href="/journal/past" className="btn btn-sm btn-ghost">
              Past entries
            </Link>
            <Link href="/journal/decisions" className="btn btn-sm btn-ghost">
              Decisions log
            </Link>
          </>
        }
      />

      <JournalEditor />
    </div>
  );
}

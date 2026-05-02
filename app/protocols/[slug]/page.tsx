import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { getProtocol } from "@/lib/protocols/definitions";
import { ProtocolRunner } from "@/components/protocols/ProtocolRunner";

export default async function ProtocolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireUserContext();
  const { slug } = await params;
  const protocol = getProtocol(slug);
  if (!protocol) notFound();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/identity"
          className="text-xs text-ink-400 hover:text-ink-100 transition"
        >
          ← Identity
        </Link>
        <div className="text-xs text-ink-400 uppercase tracking-[0.18em]">
          {format(new Date(), "EEEE · MMMM d")}
        </div>
      </div>
      <ProtocolRunner protocol={protocol} />
    </div>
  );
}

import { notFound } from "next/navigation";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { getProtocol } from "@/lib/protocols/definitions";
import { ProtocolRunner } from "@/components/protocols/ProtocolRunner";
import { PageStamp } from "@/components/PageStamp";

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
      <PageStamp backHref="/identity" backLabel="Identity" />
      <ProtocolRunner protocol={protocol} />
    </div>
  );
}

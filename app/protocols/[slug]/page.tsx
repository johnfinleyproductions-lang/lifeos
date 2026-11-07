import { notFound, redirect } from "next/navigation";
import { requireUserContext } from "@/lib/auth/server-helpers";
import { getProtocol } from "@/lib/protocols/definitions";
import { PageStamp } from "@/components/PageStamp";
import { KEPT_PROTOCOL_SET, RETIRED_PROTOCOL_ROUTES } from "../kept";
import { Runner } from "./Runner";

/**
 * One protocol, run from its intro sheet to its save.
 *
 * The page stamp carries the protocol's name as the page's h1; the
 * runner had none before. A retired protocol's slug sends you to the
 * ritual that replaced it rather than a dead end.
 */
export default async function ProtocolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireUserContext();
  const { slug } = await params;

  if (RETIRED_PROTOCOL_ROUTES[slug]) redirect(RETIRED_PROTOCOL_ROUTES[slug]);
  const protocol = getProtocol(slug);
  if (!protocol || !KEPT_PROTOCOL_SET.has(slug)) notFound();

  return (
    <div className="max-w-3xl mx-auto">
      <PageStamp
        title={protocol.title}
        backHref="/identity"
        backLabel="Identity"
      />
      <Runner protocol={protocol} />
    </div>
  );
}

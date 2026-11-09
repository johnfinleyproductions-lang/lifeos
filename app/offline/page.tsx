import { OfflineDesk } from "@/components/offline/OfflineDesk";
import { PageStamp } from "@/components/PageStamp";

export const metadata = { title: "Offline desk · LifeOS" };

/**
 * Where writing goes when LifeOS cannot reach its data.
 *
 * This page reads nothing from the database, on purpose: it has to render
 * with no connection, and a copy of it is kept by the service worker for a
 * browser that cannot reach the server at all. Everything on it lives in
 * the browser. See lib/offline/outbox.ts.
 */
export default function OfflinePage() {
  return (
    <div className="max-w-2xl mx-auto">
      <PageStamp
        title="Offline desk"
        subtitle="Kept on this device, sent when you are back."
      />
      <OfflineDesk />
    </div>
  );
}

import { ncbConfig, ncbFetch } from "@/lib/ncb/config";

// A health check that only proves Node is running covers the one failure a
// container restart already fixes. This one asks NoCodeBackend a question
// that needs no sign-in, so "ok" means the app is serving and can reach the
// place its data lives.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { authUrl, instance } = ncbConfig();
    const res = await ncbFetch(
      `${authUrl}/providers?instance=${encodeURIComponent(instance)}`,
      { method: "GET", headers: { "X-Database-Instance": instance } },
    );
    if (res.status !== 200) throw new Error(`providers answered ${res.status}`);
    return Response.json({ ok: true, db: "up" });
  } catch (err) {
    // Unauthenticated endpoint: log the detail, return none of it.
    console.error("[health] NoCodeBackend check failed", err);
    return Response.json({ ok: false, db: "down" }, { status: 503 });
  }
}

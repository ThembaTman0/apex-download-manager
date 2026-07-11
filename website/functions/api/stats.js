// GET /api/stats: total download count only, { total, updated }.
// Nothing per-user or per-region is stored, so nothing more can be served.

export async function onRequest(context) {
  const { env } = context;

  const raw = await env.STATS.get("downloads:total");
  const total = raw ? parseInt(raw, 10) : 0;

  return new Response(
    JSON.stringify({ total, updated: new Date().toISOString() }),
    {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=60",
      },
    }
  );
}

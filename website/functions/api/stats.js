// GET /api/stats — public read-only JSON for the stats dashboard.
// { total: number, countries: [{ code, count }], updated: ISO string }

export async function onRequest(context) {
  const { env } = context;

  const list = await env.STATS.list({ prefix: "country:" });
  const countries = [];
  let total = 0;

  for (const { name } of list.keys) {
    const raw = await env.STATS.get(name);
    const count = raw ? parseInt(raw, 10) : 0;
    if (count <= 0) continue;
    total += count;
    countries.push({ code: name.slice("country:".length), count });
  }

  countries.sort((a, b) => b.count - a.count);

  return new Response(
    JSON.stringify({ total, countries, updated: new Date().toISOString() }),
    {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=60",
      },
    }
  );
}

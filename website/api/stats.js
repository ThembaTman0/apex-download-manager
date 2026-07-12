// GET /api/stats: total download count only, { total, updated }.
// Nothing per-user or per-region is stored, so nothing more can be served.
// Returns { total: 0 } until a KV database is connected; the site hides
// the counter when the total is 0.

export default async function handler(req, res) {
  let total = 0;

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (url && token) {
    try {
      const r = await fetch(`${url}/get/downloads:total`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      total = data.result ? parseInt(data.result, 10) : 0;
    } catch {
      // Serve 0 rather than an error; the counter is decorative.
    }
  }

  res.setHeader("Cache-Control", "public, max-age=60");
  res.json({ total, updated: new Date().toISOString() });
}

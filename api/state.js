import { requireAdmin, isAdmin } from "./_auth.js";
import { backend, loadState, saveState } from "./_kv.js";

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (!backend()) return res.status(503).json({ error: "Storage isn't connected to this project." });
  try {
    if (req.method === "GET") {
      const { text, oldStoreError } = await loadState();
      res.setHeader("Content-Type", "application/json");
      // Visitors get a CDN-cached copy (refreshed every minute); the logged-in editor always gets the latest
      if (req.query.fresh !== undefined || isAdmin(req)) res.setHeader("Cache-Control", "private, no-store");
      else res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=600");
      if (!text && oldStoreError) { res.setHeader("Cache-Control", "no-store"); return res.status(200).send(JSON.stringify({ empty: true, oldStoreError })); }
      return res.status(200).send(text || "null");
    }
    if (req.method === "PUT") {
      if (!requireAdmin(req, res)) return;
      const body = req.body;
      if (!body || !Array.isArray(body.wads)) return res.status(400).json({ error: "That doesn't look like catalog data." });
      body.savedAt = new Date().toISOString();
      await saveState(body);
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ ok: true, savedAt: body.savedAt });
    }
    res.status(405).end();
  } catch (e) {
    console.error(e);
    res.setHeader("Cache-Control", "no-store");
    res.status(500).json({ error: "Storage error: " + (e.message || e) });
  }
}

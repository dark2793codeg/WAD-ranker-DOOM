import { put, list, del } from "@vercel/blob";
import { requireAdmin, isAdmin, blobToken } from "./_auth.js";

export const config = { maxDuration: 30 };
const KEEP = 30; // older saves kept as automatic backups

async function versions(token) {
  let blobs = [], cursor;
  do { const r = await list({ prefix: "state/", cursor, limit: 1000, token }); blobs = blobs.concat(r.blobs); cursor = r.hasMore ? r.cursor : undefined; } while (cursor);
  return blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}

export default async function handler(req, res) {
  const token = blobToken();
  if (!token) return res.status(503).json({ error: "Storage isn't connected to this project." });
  try {
    if (req.method === "GET") {
      const all = await versions(token);
      if (req.query.history !== undefined) {
        if (!isAdmin(req)) return res.status(401).json({ error: "Log in first." });
        return res.status(200).json(all.map(b => ({ url: b.url, at: b.uploadedAt, size: b.size })));
      }
      const want = req.query.v && isAdmin(req) ? all.find(b => b.url === req.query.v) : all[0];
      if (!want) return res.status(200).json(null);
      const r = await fetch(want.url, { cache: "no-store" });
      res.setHeader("Content-Type", "application/json");
      return res.status(200).send(await r.text());
    }
    if (req.method === "PUT") {
      if (!requireAdmin(req, res)) return;
      const body = req.body;
      if (!body || !Array.isArray(body.wads)) return res.status(400).json({ error: "That doesn't look like catalog data." });
      body.savedAt = new Date().toISOString();
      const b = await put("state/state.json", JSON.stringify(body), { access: "public", addRandomSuffix: true, contentType: "application/json", cacheControlMaxAge: 31536000, token });
      const all = await versions(token);
      const old = all.slice(KEEP).map(x => x.url);
      if (old.length) await del(old, { token });
      return res.status(200).json({ ok: true, savedAt: body.savedAt, url: b.url });
    }
    res.status(405).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Storage error: " + (e.message || e) });
  }
}

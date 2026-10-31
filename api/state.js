import { requireAdmin, isAdmin } from "./_auth.js";
import { configured, putBlob, listAll, readText, delBlobs } from "./_store.js";

export const config = { maxDuration: 30 };
const KEEP = 30; // older saves kept as automatic backups

const versions = async () => (await listAll("state/")).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

export default async function handler(req, res) {
  if (!configured()) return res.status(503).json({ error: "Storage isn't connected to this project." });
  try {
    if (req.method === "GET") {
      const all = await versions();
      if (req.query.history !== undefined) {
        if (!isAdmin(req)) return res.status(401).json({ error: "Log in first." });
        return res.status(200).json(all.map(b => ({ url: b.url, at: b.uploadedAt, size: b.size })));
      }
      const want = req.query.v && isAdmin(req) ? all.find(b => b.url === req.query.v) : all[0];
      if (!want) return res.status(200).json(null);
      const text = await readText(want.url);
      res.setHeader("Content-Type", "application/json");
      return res.status(200).send(text ?? "null");
    }
    if (req.method === "PUT") {
      if (!requireAdmin(req, res)) return;
      const body = req.body;
      if (!body || !Array.isArray(body.wads)) return res.status(400).json({ error: "That doesn't look like catalog data." });
      body.savedAt = new Date().toISOString();
      await putBlob("state/state.json", JSON.stringify(body), { contentType: "application/json", cacheControlMaxAge: 60 });
      const old = (await versions()).slice(KEEP).map(x => x.url);
      if (old.length) await delBlobs(old);
      return res.status(200).json({ ok: true, savedAt: body.savedAt });
    }
    res.status(405).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Storage error: " + (e.message || e) });
  }
}

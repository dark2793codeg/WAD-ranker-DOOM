import { Readable } from "node:stream";
import { configured, readBlob } from "./_store.js";
export default async function handler(req, res) {
  const p = String(req.query.p || "");
  if (!configured() || !/^images\/[A-Za-z0-9._-]+$/.test(p)) return res.status(404).end();
  try {
    const r = await readBlob(p, "private");
    if (!r) return res.status(404).end();
    res.setHeader("Content-Type", r.blob.contentType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    Readable.fromWeb(r.stream).pipe(res);
  } catch (e) { console.error(e); res.status(404).end(); }
}

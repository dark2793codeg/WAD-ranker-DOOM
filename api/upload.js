import { requireAdmin } from "./_auth.js";
import { configured, putBlob } from "./_store.js";
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!requireAdmin(req, res)) return;
  if (!configured()) return res.status(503).json({ error: "Storage isn't connected to this project." });
  const m = /^data:(image\/(jpeg|png|webp|gif));base64,(.+)$/s.exec(req.body?.dataUrl || "");
  if (!m) return res.status(400).json({ error: "Send a JPEG, PNG, WebP or GIF image." });
  const ext = { jpeg: "jpg", png: "png", webp: "webp", gif: "gif" }[m[2]];
  const buf = Buffer.from(m[3], "base64");
  if (buf.length > 4_000_000) return res.status(413).json({ error: "Image is larger than 4 MB." });
  try {
    const b = await putBlob(`images/${(req.body.name || "shot").replace(/[^a-z0-9-]/gi, "-").slice(0, 60)}.${ext}`, buf, { contentType: m[1] });
    // Private stores can't be linked to directly, so those images are served through /api/img
    res.status(200).json({ url: b.access === "private" ? `/api/img?p=${encodeURIComponent(b.pathname)}` : b.url });
  } catch (e) { console.error(e); res.status(500).json({ error: "Upload failed: " + (e.message || e) }); }
}

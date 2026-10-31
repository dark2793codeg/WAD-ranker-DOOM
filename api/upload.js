import { put } from "@vercel/blob";
import { requireAdmin } from "./_auth.js";
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!requireAdmin(req, res)) return;
  const m = /^data:(image\/(jpeg|png|webp|gif));base64,(.+)$/s.exec(req.body?.dataUrl || "");
  if (!m) return res.status(400).json({ error: "Send a JPEG, PNG, WebP or GIF image." });
  const ext = { jpeg: "jpg", png: "png", webp: "webp", gif: "gif" }[m[2]];
  const buf = Buffer.from(m[3], "base64");
  if (buf.length > 4_000_000) return res.status(413).json({ error: "Image is larger than 4 MB." });
  try {
    const b = await put(`images/${(req.body.name || "shot").replace(/[^a-z0-9-]/gi, "-").slice(0, 60)}.${ext}`, buf, { access: "public", addRandomSuffix: true, contentType: m[1] });
    res.status(200).json({ url: b.url });
  } catch (e) { console.error(e); res.status(500).json({ error: "Upload failed: " + (e.message || e) }); }
}

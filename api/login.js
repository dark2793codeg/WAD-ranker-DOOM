import { checkPassword, sessionCookie, clearCookie, passwordSet } from "./_auth.js";
export default async function handler(req, res) {
  if (req.method === "DELETE") { res.setHeader("Set-Cookie", clearCookie); return res.status(200).json({ ok: true }); }
  if (req.method !== "POST") return res.status(405).end();
  if (!passwordSet()) return res.status(503).json({ error: "No admin password is set yet. Add ADMIN_PASSWORD in the Vercel project settings, then redeploy." });
  const pw = req.body?.password || "";
  if (!checkPassword(pw)) { await new Promise(r => setTimeout(r, 800)); return res.status(401).json({ error: "Wrong password." }); }
  res.setHeader("Set-Cookie", sessionCookie());
  res.status(200).json({ ok: true });
}

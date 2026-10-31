import crypto from "node:crypto";

const PW = () => process.env.ADMIN_PASSWORD || "";
const key = () => crypto.createHash("sha256").update("wad-ranker:" + PW()).digest();
const sign = exp => crypto.createHmac("sha256", key()).update(String(exp)).digest("hex");
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

export const passwordSet = () => PW().length > 0;

export function isAdmin(req) {
  if (!passwordSet()) return false;
  const c = (req.headers.cookie || "").split(/;\s*/).find(x => x.startsWith("wr_s="));
  if (!c) return false;
  const [exp, sig] = decodeURIComponent(c.slice(5)).split(".");
  if (!exp || !sig || +exp < Date.now()) return false;
  return same(sig, sign(exp));
}

export function checkPassword(pw) {
  if (!passwordSet()) return false;
  const h = s => crypto.createHash("sha256").update(String(s)).digest("hex");
  return same(h(pw), h(PW()));
}

export function sessionCookie() {
  const exp = Date.now() + 30 * 24 * 3600 * 1000;
  return `wr_s=${encodeURIComponent(exp + "." + sign(exp))}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${30 * 24 * 3600}`;
}
export const clearCookie = "wr_s=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0";

export function requireAdmin(req, res) {
  if (req.headers["content-type"]?.split(";")[0] !== "application/json") { res.status(415).json({ error: "JSON only" }); return false; }
  if (!isAdmin(req)) { res.status(401).json({ error: "Log in to make changes." }); return false; }
  return true;
}

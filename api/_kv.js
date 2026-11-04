// Catalog data store.
// Preferred: Upstash Redis (Vercel Marketplace), which is built for frequent small writes.
// Fallback: one fixed Blob file, overwritten in place (1 write per save, no listing).
import { put, get, list } from "@vercel/blob";
import { blobToken } from "./_auth.js";

function redisEnv() {
  const e = process.env;
  const pairs = [["KV_REST_API_URL", "KV_REST_API_TOKEN"], ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]];
  for (const [u, t] of pairs) if (e[u] && e[t]) return { url: e[u], token: e[t] };
  // Custom-prefixed vars, e.g. STORAGE_KV_REST_API_URL
  const u = Object.keys(e).find(k => /(KV_REST_API_URL|REDIS_REST_URL)$/.test(k));
  if (u) { const t = u.replace(/URL$/, "TOKEN"); if (e[t]) return { url: e[u], token: e[t] }; }
  return null;
}
export const backend = () => (redisEnv() ? "redis" : blobToken() || process.env.BLOB_STORE_ID ? "blob" : null);

async function redis(cmd) {
  const { url, token } = redisEnv();
  const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(cmd) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || `Redis request failed (${r.status})`);
  return j.result;
}

const blobCreds = () => { const t = blobToken(); return t ? { token: t } : {}; };
let BLOB_ACCESS = process.env.BLOB_ACCESS || null;
async function blobRead(pathname) {
  for (const access of BLOB_ACCESS ? [BLOB_ACCESS] : ["public", "private"]) {
    try { const r = await get(pathname, { access, ...blobCreds() }); if (r?.stream) { BLOB_ACCESS = access; return await new Response(r.stream).text(); } if (r === null) return null; }
    catch (e) { if (BLOB_ACCESS) throw e; }
  }
  return null;
}
async function blobWrite(pathname, text) {
  let first;
  for (const access of BLOB_ACCESS ? [BLOB_ACCESS] : ["public", "private"]) {
    try { await put(pathname, text, { access, ...blobCreds(), addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 60 }); BLOB_ACCESS = access; return; }
    catch (e) { first ||= e; }
  }
  throw first;
}
// Saves made by the first version of the site: many state/state-<random>.json files. Read the newest once.
async function blobReadLegacy() {
  const r = await list({ prefix: "state/state", limit: 1000, ...blobCreds() });
  const newest = r.blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
  if (!newest) return null;
  const g = await get(newest.url, { access: /\.private\.blob\./.test(newest.url) ? "private" : "public", ...blobCreds() });
  return g?.stream ? await new Response(g.stream).text() : null;
}

// Returns { text, from } or { text: null, oldStoreError } when nothing could be read
export async function loadState() {
  if (backend() === "redis") {
    const text = await redis(["GET", "wr:state"]);
    if (text) return { text, from: "redis" };
    // First run on Redis: try to bring over what Blob had
    try {
      if (blobToken() || process.env.BLOB_STORE_ID) {
        const old = (await blobRead("state/current.json")) || (await blobReadLegacy());
        if (old) { await redis(["SET", "wr:state", old]); return { text: old, from: "blob-migrated" }; }
      }
    } catch (e) { return { text: null, oldStoreError: e.message || String(e) }; }
    return { text: null };
  }
  const text = (await blobRead("state/current.json")) || (await blobReadLegacy());
  return { text, from: "blob" };
}

let lastSnapDay = null;
export async function saveState(body) {
  const day = new Date().toISOString().slice(0, 10);
  const text = JSON.stringify(body);
  if (backend() === "redis") {
    await redis(["SET", "wr:state", text]);
    // One dated backup per day (the day's first save), kept for 45 days
    if (lastSnapDay !== day) { await redis(["SET", `wr:snap:${day}`, text, "EX", String(45 * 86400), "NX"]); lastSnapDay = day; }
    return;
  }
  await blobWrite("state/current.json", text);
  if (lastSnapDay !== day) { await blobWrite(`state/backup-${day}.json`, text); lastSnapDay = day; }
}

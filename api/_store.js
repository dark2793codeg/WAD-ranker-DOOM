// Works with both kinds of Vercel Blob setup:
// - a read-write token (BLOB_READ_WRITE_TOKEN, or a custom-prefixed one), or
// - OIDC (BLOB_STORE_ID, which newer stores add when connected to a project),
// and with both public and private stores.
import { put, list, del, get } from "@vercel/blob";
import { blobToken } from "./_auth.js";

export const configured = () => !!(blobToken() || process.env.BLOB_STORE_ID);
const creds = () => { const t = blobToken(); return t ? { token: t } : {}; };
const accessOf = url => (/\.private\.blob\./.test(url) ? "private" : "public");
let ACCESS = process.env.BLOB_ACCESS || null;

export async function putBlob(pathname, body, opts = {}) {
  const tries = ACCESS ? [ACCESS] : ["public", "private"];
  let first;
  for (const access of tries) {
    try { const b = await put(pathname, body, { ...opts, ...creds(), access, addRandomSuffix: true }); ACCESS = access; return { ...b, access }; }
    catch (e) { first ||= e; }
  }
  throw first;
}

export async function listAll(prefix) {
  let blobs = [], cursor;
  do { const r = await list({ prefix, cursor, limit: 1000, ...creds() }); blobs = blobs.concat(r.blobs); cursor = r.hasMore ? r.cursor : undefined; } while (cursor);
  return blobs;
}

export async function readBlob(urlOrPath, access) {
  const r = await get(urlOrPath, { access: access || accessOf(urlOrPath), ...creds() });
  if (!r || !r.stream) return null;
  return r;
}
export async function readText(url) {
  const r = await readBlob(url);
  return r ? await new Response(r.stream).text() : null;
}
export const delBlobs = urls => del(urls, creds());

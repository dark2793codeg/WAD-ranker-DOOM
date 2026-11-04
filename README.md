# WAD Ranker & Reviewer (live site)

Static page (`index.html`) plus four small Vercel Functions in `api/`.

- `api/state.js` reads and saves the whole catalog as JSON. With an Upstash Redis database connected (Vercel Marketplace, free tier) it lives in Redis key `wr:state`, plus one dated snapshot per day (`wr:snap:YYYY-MM-DD`, kept 45 days). Without Redis it falls back to one Blob file (`state/current.json`) overwritten in place. Visitors get a CDN-cached copy refreshed every minute, so page views barely touch storage.
- `api/upload.js` stores TITLEPICs and map screenshots in Vercel Blob (the page shrinks them to 1600px JPEG first).
- `api/login.js` / `api/me.js` handle the single admin login. Visitors get a read-only site.
- `seed.json` is the Doom_Catalog.xlsb import. It is only used until the first save.

## Vercel setup

1. Import this folder (from its GitHub repo) as a new Vercel project. Framework preset: **Other**. No build command.
2. Storage tab: add **Upstash Redis** from the Marketplace (free plan) and connect it to the project, for the catalog data. Then create a **Blob** store for images and connect it to the project (all environments). Either kind works: newer stores add `BLOB_STORE_ID` (OIDC), older ones add `BLOB_READ_WRITE_TOKEN`. Public or private access both work; private-store images are served through `/api/img`.
3. Settings → Environment Variables: add `ADMIN_PASSWORD` (type Sensitive) with the password you'll use to log in.
4. Redeploy. Open the site, click **Log in**, and edit.

# WAD Ranker & Reviewer (live site)

Static page (`index.html`) plus four small Vercel Functions in `api/`.

- `api/state.js` reads and saves the whole catalog as JSON in Vercel Blob. Every save is a new file; the last 30 are kept as automatic backups.
- `api/upload.js` stores TITLEPICs and map screenshots in Vercel Blob (the page shrinks them to 1600px JPEG first).
- `api/login.js` / `api/me.js` handle the single admin login. Visitors get a read-only site.
- `seed.json` is the Doom_Catalog.xlsb import. It is only used until the first save.

## Vercel setup

1. Import this folder (from its GitHub repo) as a new Vercel project. Framework preset: **Other**. No build command.
2. Storage tab: create a **Blob** store and connect it to the project. This adds `BLOB_READ_WRITE_TOKEN`.
3. Settings → Environment Variables: add `ADMIN_PASSWORD` (type Sensitive) with the password you'll use to log in.
4. Redeploy. Open the site, click **Log in**, and edit.

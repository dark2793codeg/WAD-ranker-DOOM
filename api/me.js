import { isAdmin, passwordSet } from "./_auth.js";
export default function handler(req, res) {
  res.status(200).json({ server: true, admin: isAdmin(req), passwordSet: passwordSet(), storage: !!process.env.BLOB_READ_WRITE_TOKEN });
}

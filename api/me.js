import { isAdmin, passwordSet, blobToken } from "./_auth.js";
export default function handler(req, res) {
  res.status(200).json({ server: true, admin: isAdmin(req), passwordSet: passwordSet(), storage: !!blobToken() });
}

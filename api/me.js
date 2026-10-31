import { isAdmin, passwordSet } from "./_auth.js";
import { configured } from "./_store.js";
export default function handler(req, res) {
  res.status(200).json({ server: true, admin: isAdmin(req), passwordSet: passwordSet(), storage: configured() });
}

import { isAdmin, passwordSet } from "./_auth.js";
import { backend } from "./_kv.js";
import { configured } from "./_store.js";
export default function handler(req, res) {
  res.status(200).json({ server: true, admin: isAdmin(req), passwordSet: passwordSet(), storage: !!backend(), dataStore: backend(), imageStore: configured() });
}

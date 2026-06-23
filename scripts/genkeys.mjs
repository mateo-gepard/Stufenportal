import webpush from "web-push";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  console.log(".env.local existiert bereits — nichts überschrieben.");
  process.exit(0);
}

const vapid = webpush.generateVAPIDKeys();
const secret = crypto.randomBytes(32).toString("hex");

const content = `# Automatisch generiert von scripts/genkeys.mjs — nicht committen.
# Admin-/Sprecher-Code: damit schaltest du in "Mehr → Sprecher-Modus" die Verwaltung frei.
ADMIN_CODE=stufe2026

# Signier-Secret für Admin-Cookie & anonyme Stimm-Hashes.
SP_SECRET=${secret}

# Web-Push (VAPID). Öffentlicher Key geht auch an den Client.
NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapid.publicKey}
VAPID_PRIVATE_KEY=${vapid.privateKey}
VAPID_SUBJECT=mailto:stufe@example.org
`;

fs.writeFileSync(envPath, content);
console.log("✓ .env.local geschrieben (ADMIN_CODE=stufe2026).");

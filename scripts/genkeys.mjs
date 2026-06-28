import webpush from "web-push";
import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  console.log(".env.local existiert bereits — nichts überschrieben.");
  process.exit(0);
}

const vapid = webpush.generateVAPIDKeys();

const content = `# Automatisch generiert von scripts/genkeys.mjs — nicht committen.
# Web-Push (VAPID). Öffentlicher Key geht auch an den Client.
NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapid.publicKey}
VAPID_PRIVATE_KEY=${vapid.privateKey}
VAPID_SUBJECT=mailto:stufe@example.org
`;

fs.writeFileSync(envPath, content);
console.log("✓ .env.local geschrieben (VAPID-Keys).");

import { getDb } from "./db";
import { newId, nowIso } from "./util";

// Bild-Speicher als kleine Abstraktion. Aktuell DB-basiert (BLOB), damit Uploads
// auch auf Vercel funktionieren (dort ist das Dateisystem ephemer/read-only).
// Wer spaeter auf Vercel Blob / S3 / R2 wechseln will, ersetzt nur diese drei
// Funktionen — die Aufrufer (Abizeitung-Routen) bleiben unveraendert.

export interface StoredImage {
  data: Buffer;
  mime: string;
}

/** Speichert Bild-Bytes und gibt eine opake Storage-ID zurueck. */
export async function saveImage(bytes: Buffer, mime: string): Promise<string> {
  const id = newId();
  await getDb()
    .prepare("INSERT INTO upload_blobs (id, mime, data, byte_size, created_at) VALUES (?,?,?,?,?)")
    .run(id, mime, bytes as unknown as Uint8Array, bytes.byteLength, nowIso());
  return id;
}

/** Liest ein Bild anhand seiner Storage-ID; null wenn nicht vorhanden. */
export async function readImage(id: string): Promise<StoredImage | null> {
  const row = await getDb()
    .prepare("SELECT mime, data FROM upload_blobs WHERE id = ?")
    .get<{ mime: string; data: unknown }>(id);
  if (!row || row.data == null) return null;
  return { data: toBuffer(row.data), mime: String(row.mime) };
}

/** Loescht ein Bild endgueltig (Hard-Delete aus dem Papierkorb). */
export async function deleteImage(id: string): Promise<void> {
  await getDb().prepare("DELETE FROM upload_blobs WHERE id = ?").run(id);
}

function toBuffer(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (value instanceof ArrayBuffer) return Buffer.from(new Uint8Array(value));
  return Buffer.from(value as ArrayBufferLike);
}

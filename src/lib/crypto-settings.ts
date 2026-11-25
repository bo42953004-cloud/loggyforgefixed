import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
function encryptionKey() {
  const raw = process.env.APP_ENCRYPTION_KEY || "";
  let key: Buffer;
  if (/^[a-f0-9]{64}$/i.test(raw)) key = Buffer.from(raw, "hex");
  else { try { key = Buffer.from(raw, "base64"); } catch { key = Buffer.alloc(0); } }
  if (key.length !== 32) throw new Error("APP_ENCRYPTION_KEY must be a 32-byte base64 or 64-character hex key.");
  return key;
}
export function encryptSecret(value: string) {
  if (!value) return "";
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `enc:v1:${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${encrypted.toString("base64url")}`;
}
export function decryptSecret(value: string) {
  if (!value) return "";
  if (!value.startsWith("enc:v1:")) throw new Error("Stored integration secret is not encrypted. Re-enter it in admin settings.");
  const [, , iv, tag, data] = value.split(":");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

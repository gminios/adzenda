import crypto from "crypto";

function getEncryptionKey(): Buffer {
  const key = process.env.META_TOKEN_ENCRYPTION_KEY;
  if (!key) throw new Error("META_TOKEN_ENCRYPTION_KEY no está configurada");
  const buf = Buffer.from(key, "hex");
  if (buf.length !== 32) throw new Error("META_TOKEN_ENCRYPTION_KEY debe ser 32 bytes (64 hex chars)");
  return buf;
}

export function encryptToken(token: string): {
  encrypted: string;
  iv: string;
  authTag: string;
} {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recomendado para AES-GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return {
    encrypted: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
  };
}

export function decryptToken(encrypted: string, iv: string, authTag: string): string {
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

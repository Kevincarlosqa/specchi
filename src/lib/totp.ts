import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** TOTP (RFC 6238), compatible con Google Authenticator: SHA-1, 6 dígitos, 30 segundos. */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateSecret(bytes = 20) {
  const buf = randomBytes(bytes);
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of buf) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    value &= (1 << bits) - 1;
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function decode(secret: string) {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of secret.replace(/=+$/, "").toUpperCase()) {
    const i = ALPHABET.indexOf(ch);
    if (i < 0) throw new Error("Secreto inválido");
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
    value &= (1 << bits) - 1;
  }
  return Buffer.from(out);
}

export function totpCode(secret: string, at = Date.now()) {
  const counter = Math.floor(at / 30_000);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hash = createHmac("sha1", decode(secret)).update(msg).digest();
  const offset = hash[hash.length - 1]! & 15;
  const code = (hash.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(code).padStart(6, "0");
}

/** Acepta el código actual y los vecinos (±30 s) por si el reloj del teléfono no está exacto. */
export function verifyTotp(secret: string, code: string, at = Date.now()) {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  return [-1, 0, 1].some((w) => timingSafeEqual(Buffer.from(totpCode(secret, at + w * 30_000)), Buffer.from(clean)));
}

export function otpauthUrl(secret: string, account: string, issuer = "SPECCHi") {
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

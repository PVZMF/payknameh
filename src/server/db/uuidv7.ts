import { randomBytes } from "node:crypto";

/**
 * UUIDv7 (RFC 9562): 48-bit Unix milliseconds, then random bits.
 * Tech §7.2: all IDs are UUIDv7. Generated in app code so it works on any PostgreSQL version.
 */
export function uuidv7(now: number = Date.now()): string {
  const bytes = randomBytes(16);
  bytes.writeUIntBE(now, 0, 6);
  bytes.writeUInt8(0x70 | (bytes.readUInt8(6) & 0x0f), 6); // version 7
  bytes.writeUInt8(0x80 | (bytes.readUInt8(8) & 0x3f), 8); // RFC 9562 variant
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

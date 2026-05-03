"use server";

import crypto from 'crypto';

const HMAC_SECRET = 'S1dr4x-EMI-L0ck-2024!@#';

/**
 * Generate the 6-digit response code for a given challenge.
 * 
 * Algorithm: HMAC-SHA256(HMAC_SECRET, challenge) → dynamic truncation → 6 digits
 * This matches the Android OfflineUnlockKeyGenerator.computeResponse() exactly.
 *
 * @param challenge - The 8-character challenge code shown on the device
 * @returns 6-digit zero-padded response string
 */
export async function generateOfflineResponse(challenge: string): Promise<string> {
  const hash = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(challenge, 'utf8')
    .digest();

  // Dynamic truncation (RFC 4226 style)
  const offset = hash[hash.length - 1] & 0x0f;
  const code =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  return String(code % 1_000_000).padStart(6, '0');
}

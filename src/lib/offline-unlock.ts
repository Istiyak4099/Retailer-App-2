"use server";

import crypto from 'crypto';

const HMAC_SECRET = 'S1dr4x-EMI-L0ck-2024!@#';

const RESPONSE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const RESPONSE_LENGTH = 8;

/**
 * Generate the 8-character response code for a given challenge.
 * 
 * @param challenge - The 6-digit challenge code shown on the device
 * @returns 8-character alphanumeric response string
 */
export async function generateOfflineResponse(challenge: string): Promise<string> {
    // 1. Create an HMAC-SHA256 hash using the shared secret
    const hmac = crypto.createHmac('sha256', HMAC_SECRET);
    hmac.update(challenge, 'utf8');
    const hash = hmac.digest(); // Returns a Buffer of bytes

    // 2. Map the first 8 bytes of the hash to our allowed character set
    let response = "";
    for (let i = 0; i < RESPONSE_LENGTH; i++) {
        const byteValue = hash[i]; 
        response += RESPONSE_CHARS[byteValue % RESPONSE_CHARS.length];
    }
    
    return response;
}

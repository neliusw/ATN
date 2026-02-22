/**
 * Ed25519 cryptography for ATN
 *
 * Provides keypair generation, signing, and verification.
 * Uses tweetnacl, a proven, audited library.
 *
 * Design invariant:
 * - Sign canonical payload only (signature sent separately)
 * - Agent identity must be derived from public key
 * - All signatures verified before state mutations
 */

import nacl from 'tweetnacl';
import { PublicKey, Signature } from './types';

/**
 * Keypair: public and secret keys for an agent
 */
export interface Keypair {
  publicKey: PublicKey;
  secretKey: string; // base64 encoded for storage
}

/**
 * Generate a new Ed25519 keypair
 * @returns Fresh keypair
 */
export function generateKeypair(): Keypair {
  const keypair = nacl.sign.keyPair();

  return {
    publicKey: pubkeyToString(keypair.publicKey),
    secretKey: secretKeyToString(keypair.secretKey),
  };
}

/**
 * Sign a message with a secret key
 * CRITICAL: sign only the canonical payload, transmit signature separately
 *
 * @param message - Message bytes to sign (should be canonical JSON)
 * @param secretKey - Base64-encoded secret key
 * @returns Base64-encoded signature
 */
export function sign(message: Buffer, secretKey: string): Signature {
  const secret = Buffer.from(secretKey, 'base64');
  const signature = nacl.sign.detached(message, secret);

  return Buffer.from(signature).toString('base64') as Signature;
}

/**
 * Verify a signature against a public key and message
 *
 * @param message - Message bytes (should be canonical JSON)
 * @param signature - Base64-encoded signature
 * @param publicKey - Base64-encoded public key
 * @returns true if signature is valid, false otherwise
 */
export function verify(message: Buffer, signature: Signature, publicKey: PublicKey): boolean {
  try {
    const sig = Buffer.from(signature, 'base64');
    const pubkey = Buffer.from(publicKey, 'base64');

    return nacl.sign.detached.verify(message, sig, pubkey);
  } catch {
    return false;
  }
}

/**
 * Import a keypair from base64-encoded components
 * @param publicKey - Base64-encoded public key
 * @param secretKey - Base64-encoded secret key
 * @returns Keypair
 */
export function importKeypair(publicKey: PublicKey, secretKey: string): Keypair {
  // Validate that keys are valid base64 and correct length
  const pubBuffer = Buffer.from(publicKey, 'base64');
  const secBuffer = Buffer.from(secretKey, 'base64');

  if (pubBuffer.length !== 32) {
    throw new Error('Invalid public key: must be 32 bytes');
  }
  if (secBuffer.length !== 64) {
    throw new Error('Invalid secret key: must be 64 bytes');
  }

  return { publicKey, secretKey };
}

/**
 * Export a keypair as JSON (for storage)
 * SECURITY NOTE: The secret key should be encrypted at rest
 * @param keypair - Keypair to export
 * @returns JSON representation
 */
export function exportKeypair(keypair: Keypair): {
  publicKey: string;
  secretKey: string;
} {
  return {
    publicKey: keypair.publicKey,
    secretKey: keypair.secretKey,
  };
}

/**
 * Helper: Convert nacl public key to base64 string
 */
function pubkeyToString(pubkey: Uint8Array): PublicKey {
  return Buffer.from(pubkey).toString('base64') as PublicKey;
}

/**
 * Helper: Convert nacl secret key to base64 string
 */
function secretKeyToString(secret: Uint8Array): string {
  return Buffer.from(secret).toString('base64');
}

/**
 * Derive an agent ID from a public key (for invariant enforcement)
 * Simple approach: hash the public key
 * More sophisticated approaches could use DIDs
 *
 * @param publicKey - Base64-encoded public key
 * @returns Deterministic agent ID derived from the key
 */
export function deriveAgentId(publicKey: PublicKey): string {
  // For now, use a simple approach: prefix + truncated base64
  // In production, could use: did:atn:base58(pubkey) or similar
  const hash = require('crypto').createHash('sha256');
  hash.update(publicKey);
  return `agent_${hash.digest('hex').substring(0, 16)}`;
}

/**
 * SHA256 hashing for event chaining
 *
 * Design invariant:
 * - Each event in the log includes SHA256 hash of previous event
 * - This creates a tamper-evident chain: modifying any event breaks all subsequent hashes
 * - Uses Node's built-in crypto module for reliability
 */

import { createHash } from 'crypto';
import { Hash } from './types';
import { canonicalBytes } from './canonical';

/**
 * Compute SHA256 hash of arbitrary data
 * @param data - Data to hash (Buffer or string)
 * @returns Hex-encoded hash
 */
export function sha256(data: Buffer | string): Hash {
  const hashObj = createHash('sha256');

  if (typeof data === 'string') {
    hashObj.update(data, 'utf-8');
  } else {
    hashObj.update(data);
  }

  return hashObj.digest('hex') as Hash;
}

/**
 * Compute SHA256 hash of a canonical JSON object
 * This is the primary hashing function for events and payloads
 *
 * @param obj - Object to hash
 * @returns Hex-encoded hash
 */
export function hashCanonical(obj: unknown): Hash {
  const bytes = canonicalBytes(obj);
  return sha256(bytes);
}

/**
 * Create a hash chain: compute hash of [previousHash || currentPayload]
 * This ensures each event is cryptographically linked to the previous one
 *
 * @param previousHash - Hash of the previous event
 * @param currentPayload - Current event payload (will be canonicalized)
 * @returns Hash of the combined chain
 */
export function chainHash(previousHash: Hash, currentPayload: unknown): Hash {
  const combined = {
    previousHash,
    payload: currentPayload,
  };

  return hashCanonical(combined);
}

/**
 * Verify hash chain integrity
 * Recompute the hash and check it matches the stored hash
 *
 * @param previousHash - Hash of the previous event
 * @param currentPayload - Current event payload
 * @param expectedHash - Expected hash of this event
 * @returns true if hash chain is valid, false if tampered
 */
export function verifyChain(previousHash: Hash, currentPayload: unknown, expectedHash: Hash): boolean {
  const computed = chainHash(previousHash, currentPayload);
  return computed === expectedHash;
}

/**
 * Test vector: verify SHA256 produces known output
 * (for validating the hashing implementation)
 * Note: These are known correct SHA256 values
 */
export function testVectors(): { input: string; expected: Hash }[] {
  return [
    {
      input: '',
      expected: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' as Hash,
    },
  ];
}

/**
 * Verify test vectors (for validation)
 * @returns true if all test vectors pass
 */
export function verifyTestVectors(): boolean {
  for (const vector of testVectors()) {
    if (sha256(vector.input) !== vector.expected) {
      return false;
    }
  }
  return true;
}

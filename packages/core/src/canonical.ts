/**
 * Canonical JSON serialization
 *
 * Design invariant: Canonicalization must be deterministic (same input → same output)
 * This module wraps json-stable-stringify, a proven package, to ensure correctness.
 *
 * All signatures, hashes, and event logs use canonical JSON.
 */

import stringify from 'json-stable-stringify';

/**
 * Serialize an object to canonical (deterministic) JSON
 *
 * Guarantees:
 * - Keys are sorted alphabetically
 * - No extra whitespace
 * - Consistent across runs and environments
 *
 * @param obj - Object to canonicalize
 * @returns Canonical JSON string
 */
export function canonicalize(obj: unknown): string {
  const result = stringify(obj, {
    // Sort keys alphabetically for determinism
    cmp: (a, b) => a.key.localeCompare(b.key),
    // No extra whitespace
    space: '',
  });
  return result || '';
}

/**
 * Parse canonical JSON (same as normal JSON parse, just for API consistency)
 * @param json - JSON string to parse
 * @returns Parsed object
 */
export function parseCanonical(json: string): unknown {
  return JSON.parse(json);
}

/**
 * Verify that re-canonicalizing an object produces the same string
 * Useful for testing and validation
 * @param obj - Object to test
 * @param canonical - Expected canonical form
 * @returns true if obj canonicalizes to the expected form
 */
export function verifyCanonical(obj: unknown, canonical: string): boolean {
  return canonicalize(obj) === canonical;
}

/**
 * Helper to canonicalize and convert to bytes (for hashing)
 * @param obj - Object to canonicalize
 * @returns UTF-8 bytes of canonical JSON
 */
export function canonicalBytes(obj: unknown): Buffer {
  return Buffer.from(canonicalize(obj), 'utf-8');
}

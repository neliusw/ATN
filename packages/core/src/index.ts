/**
 * @atn/core - Core ATN cryptographic primitives
 *
 * Exports:
 * - Domain types (Agent, Job, Offer, etc.)
 * - Cryptographic functions (keygen, sign, verify)
 * - Canonicalization (deterministic JSON)
 * - Hashing (SHA256 with chaining)
 * - State machine (escrow transitions)
 */

// Domain types
export * from './types';

// Canonical JSON
export { canonicalize, parseCanonical, verifyCanonical, canonicalBytes } from './canonical';

// Ed25519 cryptography
export { generateKeypair, sign, verify, importKeypair, exportKeypair, deriveAgentId } from './crypto';
export type { Keypair } from './crypto';

// SHA256 hashing
export { sha256, hashCanonical, chainHash, verifyChain, verifyTestVectors } from './hash';

// Escrow state machine
export { isValidTransition, getNextStates, isTerminal, validateTransition } from './statemachine';

export const version = '0.1.0';

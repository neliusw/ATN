/**
 * Domain types for ATN (Agent Trust Node)
 *
 * All types are designed to be canonicalized, signed, and logged.
 * See ARCHITECTURE.md for design invariants.
 */

/**
 * Agent identity derived from Ed25519 public key
 * Format: did:atn:base58(pubkey) or similar deterministic mapping
 */
export type DID = string & { readonly __brand: 'DID' };

/**
 * Ed25519 public key (32 bytes, typically base58 or hex encoded)
 */
export type PublicKey = string & { readonly __brand: 'PublicKey' };

/**
 * Ed25519 signature (64 bytes, typically base58 or hex encoded)
 */
export type Signature = string & { readonly __brand: 'Signature' };

/**
 * SHA256 hash (32 bytes, typically hex encoded)
 */
export type Hash = string & { readonly __brand: 'Hash' };

/**
 * Job identifier (assigned by server)
 */
export type JobId = string & { readonly __brand: 'JobId' };

/**
 * Offer identifier (assigned by server)
 */
export type OfferId = string & { readonly __brand: 'OfferId' };

/**
 * Capability string (e.g., "dns_audit", "ml_inference")
 */
export type Capability = string & { readonly __brand: 'Capability' };

/**
 * Agent manifest: immutable spec of an agent's identity and properties
 */
export interface AgentManifest {
  name: string;
  publicKey: PublicKey;
  // agent_id should be derived from publicKey (invariant enforced at registration)
}

/**
 * Agent: registered identity in the system
 */
export interface Agent {
  did: DID;
  publicKey: PublicKey;
  name: string;
  registeredAt: number; // Unix timestamp
}

/**
 * JSON Schema for input/output validation
 * (simplified; real implementation would use full JSON Schema)
 */
export interface JsonSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

/**
 * Offer: a provider's specification for work they can perform
 */
export interface Offer {
  id: OfferId;
  providerId: DID;
  capability: Capability;
  description: string;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  pricePerJob: number; // in smallest units
  publishedAt: number; // Unix timestamp
}

/**
 * Job state machine: CREATED → FUNDED → PROVED → ATTESTED → SETTLED
 */
export enum JobState {
  CREATED = 'CREATED',
  FUNDED = 'FUNDED',
  PROVED = 'PROVED',
  ATTESTED = 'ATTESTED',
  SETTLED = 'SETTLED',
}

/**
 * Job: a contract linking client to provider for work on an offer
 */
export interface Job {
  id: JobId;
  offerId: OfferId;
  clientId: DID;
  providerId: DID;
  state: JobState;
  requiredAttestations: number; // how many witnesses must attest
  createdAt: number;
  timeoutSeconds: number;
  escrowAmount: number; // in smallest units
}

/**
 * Proof: evidence that provider delivered the work
 */
export interface Proof {
  jobId: JobId;
  dataHash: Hash; // SHA256 of deliverable
  submittedAt: number;
}

/**
 * Attestation: witness verification of job completion
 */
export enum AttestationType {
  DELIVERED_OK = 'DELIVERED_OK',
  DELIVERED_INVALID = 'DELIVERED_INVALID',
  DISPUTE = 'DISPUTE',
}

export interface Attestation {
  jobId: JobId;
  witnessId: DID;
  type: AttestationType;
  submittedAt: number;
}

/**
 * Event log entry: immutable record of a state change
 * Linked via previousHash for tamper-evidence
 */
export interface EventLogEntry {
  id: number; // auto-increment event sequence
  jobId: JobId;
  previousHash: Hash; // SHA256 of previous event (chain link)
  eventType: 'JOB_CREATED' | 'JOB_FUNDED' | 'JOB_PROVED' | 'JOB_ATTESTED' | 'JOB_SETTLED';
  actor: DID; // agent who caused the transition
  payload: unknown; // canonical JSON of the state change
  canonicalPayload: string; // serialized canonical JSON (for re-verification)
  signature: Signature; // Ed25519 signature by actor
  createdAt: number;
}

/**
 * Signed request: any mutation request to the API
 * Contains canonical payload and separate signature
 */
export interface SignedRequest {
  payload: unknown; // the canonical data being signed
  signature: Signature; // Ed25519 signature of canonicalize(payload)
  signerId: DID; // who signed (for verification lookup)
}

/**
 * Audit bundle: complete verifiable history of a job
 * Can be verified offline without server trust
 */
export interface AuditBundle {
  jobId: JobId;
  events: EventLogEntry[];
  // Includes all signatures and canonical payloads for independent re-verification
}

/**
 * Helper to create branded types
 */
export const createDID = (value: string): DID => value as DID;
export const createPublicKey = (value: string): PublicKey => value as PublicKey;
export const createSignature = (value: string): Signature => value as Signature;
export const createHash = (value: string): Hash => value as Hash;
export const createJobId = (value: string): JobId => value as JobId;
export const createOfferId = (value: string): OfferId => value as OfferId;
export const createCapability = (value: string): Capability => value as Capability;

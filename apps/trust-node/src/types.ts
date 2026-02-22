/**
 * Server request/response types
 */

/**
 * Signed request body
 * All mutations include a signature and the signing agent's DID
 */
export interface SignedRequestBody {
  payload: unknown;
  signature: string;
  signerId: string;
}

/**
 * API error response
 */
export interface ErrorResponse {
  error: string;
  details?: string;
  code?: string;
}

/**
 * Stored agent in DB
 */
export interface StoredAgent {
  did: string;
  public_key: string;
  name: string;
  registered_at: number;
  created_at: number;
}

/**
 * Stored offer in DB
 */
export interface StoredOffer {
  id: string;
  provider_id: string;
  capability: string;
  description: string;
  input_schema: string;
  output_schema: string;
  price_per_job: number;
  published_at: number;
  created_at: number;
}

/**
 * Stored job in DB
 */
export interface StoredJob {
  id: string;
  offer_id: string;
  client_id: string;
  provider_id: string;
  state: string;
  required_attestations: number;
  created_at: number;
  timeout_seconds: number;
  escrow_amount: number;
  db_created_at: number;
}

/**
 * Stored event log entry in DB
 */
export interface StoredEventLogEntry {
  id: number;
  job_id: string;
  event_type: string;
  actor: string;
  previous_hash: string;
  payload: string;
  signature: string;
  created_at: number;
}

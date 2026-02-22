/**
 * Escrow state machine for jobs
 *
 * Design invariant:
 * - Only valid transitions are allowed
 * - All transitions must be signed by authorized agent
 * - All transitions are logged as immutable events
 *
 * State machine:
 * CREATED → FUNDED → PROVED → ATTESTED → SETTLED
 */

import { JobState } from './types';

/**
 * Allowed state transitions
 * Maps from state to array of allowed next states
 */
const VALID_TRANSITIONS: Record<JobState, JobState[]> = {
  [JobState.CREATED]: [JobState.FUNDED],
  [JobState.FUNDED]: [JobState.PROVED],
  [JobState.PROVED]: [JobState.ATTESTED],
  [JobState.ATTESTED]: [JobState.SETTLED],
  [JobState.SETTLED]: [], // Terminal state, no transitions allowed
};

/**
 * Check if a state transition is valid
 * @param from - Current state
 * @param to - Desired next state
 * @returns true if transition is allowed
 */
export function isValidTransition(from: JobState, to: JobState): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

/**
 * Get allowed next states for a given state
 * @param state - Current state
 * @returns Array of valid next states
 */
export function getNextStates(state: JobState): JobState[] {
  return [...VALID_TRANSITIONS[state]];
}

/**
 * Check if a state is terminal (no further transitions allowed)
 * @param state - State to check
 * @returns true if terminal
 */
export function isTerminal(state: JobState): boolean {
  return getNextStates(state).length === 0;
}

/**
 * Validate a state transition and provide error details
 * @param from - Current state
 * @param to - Desired next state
 * @returns { valid: boolean, reason?: string }
 */
export function validateTransition(from: JobState, to: JobState): {
  valid: boolean;
  reason?: string;
} {
  if (!isValidTransition(from, to)) {
    const allowed = getNextStates(from);
    return {
      valid: false,
      reason: `Invalid transition from ${from} to ${to}. Allowed states: ${allowed.join(', ') || 'none (terminal state)'}`,
    };
  }

  return { valid: true };
}

/**
 * Describe the state machine for documentation
 */
export const STATE_MACHINE_DESCRIPTION = `
ATN Escrow State Machine

States:
  CREATED  - Job created, awaiting funding
  FUNDED   - Escrow funded, provider can submit proof
  PROVED   - Proof submitted, awaiting witness attestations
  ATTESTED - Witness attestations received, ready to settle
  SETTLED  - Job complete, escrow distributed

Transitions:
  CREATED  → FUNDED   (client funds escrow)
  FUNDED   → PROVED   (provider submits proof)
  PROVED   → ATTESTED (witness submits attestation)
  ATTESTED → SETTLED  (system settles escrow)

Rules:
  - All transitions must be signed by the responsible agent
  - All transitions are immutable and logged with hash chain
  - Only valid transitions are accepted
  - Terminal state SETTLED has no further transitions
`;

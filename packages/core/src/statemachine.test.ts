import { describe, it, expect } from 'vitest';
import { isValidTransition, getNextStates, isTerminal, validateTransition } from './statemachine';
import { JobState } from './types';

describe('Escrow State Machine', () => {
  it('should allow CREATED → FUNDED', () => {
    expect(isValidTransition(JobState.CREATED, JobState.FUNDED)).toBe(true);
  });

  it('should allow FUNDED → PROVED', () => {
    expect(isValidTransition(JobState.FUNDED, JobState.PROVED)).toBe(true);
  });

  it('should allow PROVED → ATTESTED', () => {
    expect(isValidTransition(JobState.PROVED, JobState.ATTESTED)).toBe(true);
  });

  it('should allow ATTESTED → SETTLED', () => {
    expect(isValidTransition(JobState.ATTESTED, JobState.SETTLED)).toBe(true);
  });

  it('should reject CREATED → PROVED (skip state)', () => {
    expect(isValidTransition(JobState.CREATED, JobState.PROVED)).toBe(false);
  });

  it('should reject CREATED → ATTESTED (skip multiple)', () => {
    expect(isValidTransition(JobState.CREATED, JobState.ATTESTED)).toBe(false);
  });

  it('should reject CREATED → SETTLED (skip all)', () => {
    expect(isValidTransition(JobState.CREATED, JobState.SETTLED)).toBe(false);
  });

  it('should reject backward transitions', () => {
    expect(isValidTransition(JobState.FUNDED, JobState.CREATED)).toBe(false);
    expect(isValidTransition(JobState.PROVED, JobState.FUNDED)).toBe(false);
  });

  it('should reject transitions from terminal state', () => {
    expect(isValidTransition(JobState.SETTLED, JobState.CREATED)).toBe(false);
    expect(isValidTransition(JobState.SETTLED, JobState.FUNDED)).toBe(false);
  });

  it('should return correct next states for CREATED', () => {
    const next = getNextStates(JobState.CREATED);
    expect(next).toEqual([JobState.FUNDED]);
  });

  it('should return correct next states for FUNDED', () => {
    const next = getNextStates(JobState.FUNDED);
    expect(next).toEqual([JobState.PROVED]);
  });

  it('should return correct next states for PROVED', () => {
    const next = getNextStates(JobState.PROVED);
    expect(next).toEqual([JobState.ATTESTED]);
  });

  it('should return correct next states for ATTESTED', () => {
    const next = getNextStates(JobState.ATTESTED);
    expect(next).toEqual([JobState.SETTLED]);
  });

  it('should return empty array for terminal SETTLED', () => {
    const next = getNextStates(JobState.SETTLED);
    expect(next).toEqual([]);
  });

  it('should identify SETTLED as terminal', () => {
    expect(isTerminal(JobState.SETTLED)).toBe(true);
  });

  it('should not identify other states as terminal', () => {
    expect(isTerminal(JobState.CREATED)).toBe(false);
    expect(isTerminal(JobState.FUNDED)).toBe(false);
    expect(isTerminal(JobState.PROVED)).toBe(false);
    expect(isTerminal(JobState.ATTESTED)).toBe(false);
  });

  it('should validate correct transitions', () => {
    const result = validateTransition(JobState.CREATED, JobState.FUNDED);
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should reject invalid transitions with explanation', () => {
    const result = validateTransition(JobState.CREATED, JobState.PROVED);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Invalid transition');
    expect(result.reason).toContain('CREATED');
    expect(result.reason).toContain('PROVED');
  });

  it('should explain allowed transitions in error message', () => {
    const result = validateTransition(JobState.CREATED, JobState.ATTESTED);
    expect(result.reason).toContain('Allowed states');
    expect(result.reason).toContain('FUNDED');
  });

  it('should handle terminal state in error message', () => {
    const result = validateTransition(JobState.SETTLED, JobState.CREATED);
    expect(result.reason).toContain('terminal state');
  });

  it('should define complete state flow', () => {
    expect(isValidTransition(JobState.CREATED, JobState.FUNDED)).toBe(true);
    expect(isValidTransition(JobState.FUNDED, JobState.PROVED)).toBe(true);
    expect(isValidTransition(JobState.PROVED, JobState.ATTESTED)).toBe(true);
    expect(isValidTransition(JobState.ATTESTED, JobState.SETTLED)).toBe(true);
    expect(isTerminal(JobState.SETTLED)).toBe(true);
  });
});

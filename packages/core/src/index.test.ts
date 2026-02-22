import { describe, it, expect } from 'vitest';
import * as ATN from './index';

describe('@atn/core package', () => {
  it('should export version', () => {
    expect(ATN.version).toBe('0.1.0');
  });

  it('should export types', () => {
    expect(ATN.JobState).toBeDefined();
    expect(ATN.AttestationType).toBeDefined();
  });

  it('should export cryptography functions', () => {
    expect(typeof ATN.generateKeypair).toBe('function');
    expect(typeof ATN.sign).toBe('function');
    expect(typeof ATN.verify).toBe('function');
  });

  it('should export canonicalization functions', () => {
    expect(typeof ATN.canonicalize).toBe('function');
    expect(typeof ATN.parseCanonical).toBe('function');
  });

  it('should export hashing functions', () => {
    expect(typeof ATN.sha256).toBe('function');
    expect(typeof ATN.chainHash).toBe('function');
    expect(typeof ATN.verifyChain).toBe('function');
  });

  it('should export state machine functions', () => {
    expect(typeof ATN.isValidTransition).toBe('function');
    expect(typeof ATN.getNextStates).toBe('function');
    expect(typeof ATN.isTerminal).toBe('function');
  });

  it('should work end-to-end', () => {
    // Generate keypair
    const keypair = ATN.generateKeypair();
    expect(keypair.publicKey).toBeTruthy();

    // Canonicalize payload
    const payload = { test: 'data' };
    const canonical = ATN.canonicalize(payload);
    expect(canonical).toBeTruthy();

    // Sign
    const bytes = Buffer.from(canonical);
    const signature = ATN.sign(bytes, keypair.secretKey);
    expect(signature).toBeTruthy();

    // Verify
    const verified = ATN.verify(bytes, signature, keypair.publicKey);
    expect(verified).toBe(true);

    // Hash
    const hash = ATN.sha256(canonical);
    expect(hash.length).toBe(64);

    // State machine
    expect(ATN.isValidTransition(ATN.JobState.CREATED, ATN.JobState.FUNDED)).toBe(true);
  });
});

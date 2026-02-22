import { describe, it, expect } from 'vitest';
import { sha256, hashCanonical, chainHash, verifyChain, verifyTestVectors, testVectors } from './hash';

describe('SHA256 Hashing', () => {
  it('should compute SHA256 of strings', () => {
    const hash = sha256('test');
    expect(hash).toBeTruthy();
    expect(typeof hash).toBe('string');
    expect(hash.length).toBe(64); // hex-encoded 32 bytes
  });

  it('should compute SHA256 of buffers', () => {
    const buffer = Buffer.from('test');
    const hash = sha256(buffer);
    expect(hash.length).toBe(64);
  });

  it('should produce consistent output', () => {
    const hash1 = sha256('test');
    const hash2 = sha256('test');
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different inputs', () => {
    const hash1 = sha256('test1');
    const hash2 = sha256('test2');
    expect(hash1).not.toBe(hash2);
  });

  it('should hash canonical JSON objects', () => {
    const obj = { a: 1, b: 2 };
    const hash = hashCanonical(obj);
    expect(hash.length).toBe(64);
  });

  it('should produce same hash for objects with different key order', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { b: 2, a: 1 };

    const hash1 = hashCanonical(obj1);
    const hash2 = hashCanonical(obj2);

    expect(hash1).toBe(hash2);
  });

  it('should create hash chains', () => {
    const previousHash = sha256('previous event');
    const currentPayload = { action: 'fund', amount: 100 };

    const chainedHash = chainHash(previousHash, currentPayload);

    expect(chainedHash.length).toBe(64);
  });

  it('should verify correct hash chains', () => {
    const previousHash = sha256('previous event');
    const currentPayload = { action: 'fund', amount: 100 };

    const expectedHash = chainHash(previousHash, currentPayload);

    const isValid = verifyChain(previousHash, currentPayload, expectedHash);

    expect(isValid).toBe(true);
  });

  it('should reject tampered payloads', () => {
    const previousHash = sha256('previous event');
    const currentPayload = { action: 'fund', amount: 100 };

    const expectedHash = chainHash(previousHash, currentPayload);

    // Modify the payload
    const tamperedPayload = { action: 'fund', amount: 200 };

    const isValid = verifyChain(previousHash, tamperedPayload, expectedHash);

    expect(isValid).toBe(false);
  });

  it('should reject tampered previous hashes', () => {
    const previousHash = sha256('previous event');
    const currentPayload = { action: 'fund', amount: 100 };

    const expectedHash = chainHash(previousHash, currentPayload);

    // Tamper with previous hash
    const tamperedPreviousHash = sha256('different event');

    const isValid = verifyChain(tamperedPreviousHash, currentPayload, expectedHash);

    expect(isValid).toBe(false);
  });

  it('should verify known test vectors', () => {
    // Verify test vectors are implemented correctly
    const vectors = testVectors();
    expect(vectors.length).toBeGreaterThan(0);
    for (const vec of vectors) {
      const computed = sha256(vec.input);
      expect(computed).toBe(vec.expected);
    }
  });

  it('should produce valid 64-character hex output', () => {
    const hash1 = sha256('');
    expect(hash1.length).toBe(64);
    expect(/^[0-9a-f]{64}$/.test(hash1)).toBe(true);

    const hash2 = sha256('test');
    expect(hash2.length).toBe(64);
    expect(/^[0-9a-f]{64}$/.test(hash2)).toBe(true);
  });

  it('should support hash chain with multiple events', () => {
    let hash = sha256('genesis');

    const events = [
      { type: 'created', data: 'event1' },
      { type: 'funded', data: 'event2' },
      { type: 'proved', data: 'event3' },
      { type: 'attested', data: 'event4' },
    ];

    for (const event of events) {
      hash = chainHash(hash, event);
    }

    // Now verify the entire chain
    let currentHash = sha256('genesis');
    for (const event of events) {
      const nextHash = chainHash(currentHash, event);
      expect(nextHash.length).toBe(64);
      currentHash = nextHash;
    }

    expect(currentHash).toBe(hash);
  });
});

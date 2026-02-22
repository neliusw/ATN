import { describe, it, expect } from 'vitest';
import { generateKeypair, sign, verify, importKeypair, exportKeypair, deriveAgentId } from './crypto';
import { canonicalBytes } from './canonical';

describe('Ed25519 Crypto', () => {
  it('should generate a valid keypair', () => {
    const keypair = generateKeypair();

    expect(keypair.publicKey).toBeTruthy();
    expect(keypair.secretKey).toBeTruthy();
    expect(typeof keypair.publicKey).toBe('string');
    expect(typeof keypair.secretKey).toBe('string');
  });

  it('should sign and verify a message', () => {
    const keypair = generateKeypair();
    const message = Buffer.from('test message');

    const signature = sign(message, keypair.secretKey);

    expect(verify(message, signature, keypair.publicKey)).toBe(true);
  });

  it('should reject modified messages', () => {
    const keypair = generateKeypair();
    const message = Buffer.from('test message');
    const signature = sign(message, keypair.secretKey);

    const modifiedMessage = Buffer.from('modified message');

    expect(verify(modifiedMessage, signature, keypair.publicKey)).toBe(false);
  });

  it('should reject modified signatures', () => {
    const keypair = generateKeypair();
    const message = Buffer.from('test message');
    let signature = sign(message, keypair.secretKey);

    // Flip a bit in the signature
    const sig = Buffer.from(signature, 'base64');
    sig[0] ^= 0xff; // flip all bits in first byte
    signature = sig.toString('base64');

    expect(verify(message, signature, keypair.publicKey)).toBe(false);
  });

  it('should reject signatures from different keypairs', () => {
    const keypair1 = generateKeypair();
    const keypair2 = generateKeypair();
    const message = Buffer.from('test message');

    const signature = sign(message, keypair1.secretKey);

    expect(verify(message, signature, keypair2.publicKey)).toBe(false);
  });

  it('should consistently sign the same message', () => {
    const keypair = generateKeypair();
    const message = Buffer.from('test message');

    const sig1 = sign(message, keypair.secretKey);
    const sig2 = sign(message, keypair.secretKey);
    const sig3 = sign(message, keypair.secretKey);

    expect(sig1).toBe(sig2);
    expect(sig2).toBe(sig3);
  });

  it('should sign canonical JSON correctly', () => {
    const keypair = generateKeypair();
    const payload = { job_id: '123', action: 'fund', amount: 100 };
    const bytes = canonicalBytes(payload);

    const signature = sign(bytes, keypair.secretKey);

    expect(verify(bytes, signature, keypair.publicKey)).toBe(true);
  });

  it('should export and import keypairs', () => {
    const original = generateKeypair();
    const exported = exportKeypair(original);
    const imported = importKeypair(original.publicKey, original.secretKey);

    expect(imported.publicKey).toBe(original.publicKey);
    expect(imported.secretKey).toBe(original.secretKey);

    // Verify that imported keypair works
    const message = Buffer.from('test');
    const signature = sign(message, imported.secretKey);
    expect(verify(message, signature, imported.publicKey)).toBe(true);
  });

  it('should reject invalid keypair imports', () => {
    expect(() => {
      importKeypair('invalid' as any, 'invalid');
    }).toThrow();
  });

  it('should derive consistent agent IDs from public keys', () => {
    const keypair = generateKeypair();

    const id1 = deriveAgentId(keypair.publicKey);
    const id2 = deriveAgentId(keypair.publicKey);

    expect(id1).toBe(id2);
    expect(id1).toMatch(/^agent_/);
  });

  it('should derive different agent IDs for different keys', () => {
    const keypair1 = generateKeypair();
    const keypair2 = generateKeypair();

    const id1 = deriveAgentId(keypair1.publicKey);
    const id2 = deriveAgentId(keypair2.publicKey);

    expect(id1).not.toBe(id2);
  });
});

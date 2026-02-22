import { describe, it, expect } from 'vitest';
import { canonicalize, parseCanonical, verifyCanonical, canonicalBytes } from './canonical';

describe('Canonical JSON', () => {
  it('should produce deterministic output regardless of key order', () => {
    const obj1 = { a: 1, b: 2, c: 3 };
    const obj2 = { c: 3, a: 1, b: 2 };
    const obj3 = { b: 2, c: 3, a: 1 };

    expect(canonicalize(obj1)).toBe(canonicalize(obj2));
    expect(canonicalize(obj2)).toBe(canonicalize(obj3));
    expect(canonicalize(obj1)).toBe('{"a":1,"b":2,"c":3}');
  });

  it('should handle nested objects', () => {
    const obj1 = { outer: { z: 26, a: 1 }, name: 'test' };
    const obj2 = { name: 'test', outer: { a: 1, z: 26 } };

    expect(canonicalize(obj1)).toBe(canonicalize(obj2));
  });

  it('should handle arrays', () => {
    const obj = { items: [1, 2, 3], name: 'test' };
    const canonical = canonicalize(obj);

    expect(canonical).toBe('{"items":[1,2,3],"name":"test"}');
  });

  it('should handle null and boolean values', () => {
    const obj = { a: null, b: true, c: false };
    const canonical = canonicalize(obj);

    expect(canonical).toContain('null');
    expect(canonical).toContain('true');
    expect(canonical).toContain('false');
  });

  it('should have no extra whitespace', () => {
    const obj = { a: 1, b: 2 };
    const canonical = canonicalize(obj);

    expect(canonical).not.toContain(' ');
    expect(canonical).not.toContain('\n');
  });

  it('should round-trip correctly', () => {
    const original = { name: 'Agent', pubkey: 'abc123', count: 42 };
    const canonical = canonicalize(original);
    const parsed = parseCanonical(canonical);

    expect(parsed).toEqual(original);
  });

  it('verifyCanonical should validate correctly', () => {
    const obj = { x: 1, y: 2 };
    const canonical = canonicalize(obj);

    expect(verifyCanonical(obj, canonical)).toBe(true);
    expect(verifyCanonical(obj, '{"wrong":true}')).toBe(false);
  });

  it('canonicalBytes should return UTF-8 buffer', () => {
    const obj = { test: 'data' };
    const bytes = canonicalBytes(obj);

    expect(bytes).toBeInstanceOf(Buffer);
    expect(bytes.toString('utf-8')).toBe('{"test":"data"}');
  });

  it('should be consistent across multiple calls', () => {
    const obj = { z: 1, a: 2, m: 3 };

    const canonical1 = canonicalize(obj);
    const canonical2 = canonicalize(obj);
    const canonical3 = canonicalize(obj);

    expect(canonical1).toBe(canonical2);
    expect(canonical2).toBe(canonical3);
  });
});

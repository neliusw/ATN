/**
 * Integration test for ATN REST API
 *
 * Tests the complete E2E flow:
 * 1. 3 agents register (client, provider, witness)
 * 2. Provider publishes an offer
 * 3. Client creates a job
 * 4. Client funds the job
 * 5. Provider submits proof
 * 6. Witness submits attestation
 * 7. Retrieve audit bundle
 *
 * Run with: npm test
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as ATN from '@atn/core';
import app from './index';

const BASE_URL = 'http://localhost:8080';
let server: any;

/**
 * Start server before all tests
 */
beforeAll(() => {
  return new Promise<void>((resolve) => {
    server = app.listen(8080, () => {
      resolve();
    });
  });
});

/**
 * Stop server after all tests
 */
afterAll(() => {
  return new Promise<void>((resolve) => {
    if (server) {
      server.close(() => {
        resolve();
      });
    } else {
      resolve();
    }
  });
});

/**
 * Helper to make signed API requests
 */
async function makeSignedRequest(method: string, path: string, payload: unknown, agent: { publicKey: ATN.PublicKey; secretKey: string }) {
  const canonical = ATN.canonicalize(payload);
  const bytes = Buffer.from(canonical, 'utf-8');
  const signature = ATN.sign(bytes, agent.secretKey);

  const signerId = `did:atn:${agent.publicKey.substring(0, 16)}`;

  const body = {
    payload,
    signature,
    signerId,
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  // If error, log it for debugging
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`${method} ${path} failed:`, response.status, errorText);
  }

  return response;
}

/**
 * Helper to make unsigned GET requests
 */
async function makeUnsignedRequest(method: string, path: string) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return response;
}

describe('ATN REST API Integration Tests', () => {
  let agentA: any; // Client
  let agentB: any; // Provider
  let agentC: any; // Witness
  let offerId: string;
  let jobId: string;

  // =========================================================================
  // Test Agent Registration
  // =========================================================================

  it('should register Agent A (client)', async () => {
    agentA = ATN.generateKeypair();

    const res = await makeSignedRequest('POST', '/agents', {
      name: 'Agent A (Client)',
      publicKey: agentA.publicKey,
    }, agentA);

    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.did).toContain('did:atn:');
    expect(data.name).toBe('Agent A (Client)');
  });

  it('should register Agent B (provider)', async () => {
    agentB = ATN.generateKeypair();

    const res = await makeSignedRequest('POST', '/agents', {
      name: 'Agent B (Provider)',
      publicKey: agentB.publicKey,
    }, agentB);

    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.did).toContain('did:atn:');
    expect(data.name).toBe('Agent B (Provider)');
  });

  it('should register Agent C (witness)', async () => {
    agentC = ATN.generateKeypair();

    const res = await makeSignedRequest('POST', '/agents', {
      name: 'Agent C (Witness)',
      publicKey: agentC.publicKey,
    }, agentC);

    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.did).toContain('did:atn:');
    expect(data.name).toBe('Agent C (Witness)');
  });

  it('should list all 3 agents', async () => {
    const res = await makeUnsignedRequest('GET', '/agents');

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.agents).toHaveLength(3);
    expect(data.count).toBe(3);
  });

  // =========================================================================
  // Test Offer Publishing
  // =========================================================================

  it('Agent B should publish an offer', async () => {
    const res = await makeSignedRequest('POST', '/offers', {
      capability: 'dns_audit',
      description: 'DNS audit service',
      inputSchema: { type: 'object' },
      outputSchema: { type: 'object' },
      pricePerJob: 1000,
    }, agentB);

    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    offerId = data.id;
    expect(data.id).toContain('offer_');
    expect(data.capability).toBe('dns_audit');
    expect(data.pricePerJob).toBe(1000);
  });

  it('should list offers', async () => {
    const res = await makeUnsignedRequest('GET', '/offers');

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.offers.length).toBeGreaterThan(0);
    expect(data.count).toBeGreaterThan(0);
  });

  it('should filter offers by capability', async () => {
    const res = await makeUnsignedRequest('GET', '/offers?capability=dns_audit');

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.offers.length).toBeGreaterThan(0);
    data.offers.forEach((o: any) => {
      expect(o.capability).toBe('dns_audit');
    });
  });

  it('should get offer details', async () => {
    const res = await makeUnsignedRequest('GET', `/offers/${offerId}`);

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.id).toBe(offerId);
    expect(data.capability).toBe('dns_audit');
  });

  // =========================================================================
  // Test Job Creation and Lifecycle
  // =========================================================================

  it('Agent A should create a job', async () => {
    const agentBDID = `did:atn:${agentB.publicKey.substring(0, 16)}`;

    const res = await makeSignedRequest('POST', '/jobs', {
      offerId,
      providerId: agentBDID,
      requiredAttestations: 1,
      timeoutSeconds: 3600,
      escrowAmount: 1000,
    }, agentA);

    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    jobId = data.id;
    expect(data.id).toContain('job_');
    expect(data.state).toBe('CREATED');
    expect(data.escrowAmount).toBe(1000);
  });

  it('should list jobs', async () => {
    const res = await makeUnsignedRequest('GET', '/jobs');

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.jobs.length).toBeGreaterThan(0);
  });

  it('should get job details', async () => {
    const res = await makeUnsignedRequest('GET', `/jobs/${jobId}`);

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.id).toBe(jobId);
    expect(data.state).toBe('CREATED');
  });

  it('Agent A should fund the job', async () => {
    const res = await makeSignedRequest('POST', `/jobs/${jobId}/fund`, {}, agentA);

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.state).toBe('FUNDED');
  });

  it('Agent B should submit proof', async () => {
    const res = await makeSignedRequest('POST', `/jobs/${jobId}/proof`, {
      proofHash: ATN.sha256('work completed'),
    }, agentB);

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.state).toBe('PROVED');
  });

  it('Agent C should submit attestation', async () => {
    const res = await makeSignedRequest('POST', `/jobs/${jobId}/attest`, {
      attestationType: 'DELIVERED_OK',
    }, agentC);

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.state).toBe('ATTESTED');
  });

  // =========================================================================
  // Test Audit
  // =========================================================================

  it('should retrieve audit bundle for job', async () => {
    const res = await makeUnsignedRequest('GET', `/audit/${jobId}`);

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.jobId).toBe(jobId);
    expect(data.events).toBeDefined();
    expect(data.eventCount).toBeGreaterThan(0);
  });

  it('audit bundle should contain all state transitions', async () => {
    const res = await makeUnsignedRequest('GET', `/audit/${jobId}`);

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    const eventTypes = data.events.map((e: any) => e.eventType);

    expect(eventTypes).toContain('JOB_CREATED');
    expect(eventTypes).toContain('JOB_FUNDED');
    expect(eventTypes).toContain('JOB_PROVED');
    expect(eventTypes).toContain('JOB_ATTESTED');
  });

  // =========================================================================
  // Test Error Cases
  // =========================================================================

  it('should reject unsigned requests on mutation endpoints', async () => {
    const response = await fetch(`${BASE_URL}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
  });

  it('should reject requests with invalid signatures', async () => {
    const res = await fetch(`${BASE_URL}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payload: {
          name: 'Attacker',
          publicKey: 'fake_key',
        },
        signature: 'invalid_signature_here',
        signerId: 'did:atn:attacker',
      }),
    });

    expect(res.status).toBe(401);
  });

  it('should reject job state transitions that violate the state machine', async () => {
    // Try to transition from ATTESTED to FUNDED (invalid)
    const res = await makeSignedRequest('POST', `/jobs/${jobId}/fund`, {}, agentA);

    // Should fail because job is already in ATTESTED state
    expect(res.status).toBe(409);
  });

  it('should return 404 for non-existent resources', async () => {
    const res = await makeUnsignedRequest('GET', '/jobs/job_nonexistent');

    expect(res.status).toBe(404);
  });
});

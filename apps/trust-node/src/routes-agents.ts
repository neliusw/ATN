/**
 * Agent endpoints
 *
 * POST   /agents          - Register agent (self-signed)
 * GET    /agents          - List all agents
 * GET    /agents/:did     - Get agent details
 */

import { Router, Request, Response } from 'express';
import * as ATN from '@atn/core';
import { getDB } from './db';
import { verifySignature, requireAgent } from './middleware';
import { StoredAgent } from './types';

const router = Router();

/**
 * POST /agents - Register agent (self-signed)
 *
 * Request body (signed by the agent's own key):
 * {
 *   "payload": { "name": "My Agent", "publicKey": "..." },
 *   "signature": "...",
 *   "signerId": "did:atn:..."
 * }
 *
 * For agent registration, we manually verify the signature matches the public key,
 * since the agent doesn't exist in the database yet.
 */
router.post('/agents', (req: Request, res: Response) => {
  try {
    const { payload, signature, signerId } = req.body;

    if (!payload || !payload.name || !payload.publicKey || !signature) {
      res.status(400).json({
        error: 'Invalid agent payload',
        details: 'Agent must include name, publicKey, and a signature',
      });
      return;
    }

    // Manually verify signature for agent registration
    const canonical = ATN.canonicalize(payload);
    const bytes = Buffer.from(canonical, 'utf-8');
    const isValid = ATN.verify(bytes, signature as ATN.Signature, payload.publicKey as ATN.PublicKey);

    if (!isValid) {
      res.status(401).json({
        error: 'Invalid signature',
        details: 'Signature does not match the provided public key',
      });
      return;
    }

    // Verify that signerId matches the public key
    const expectedDID = `did:atn:${payload.publicKey.substring(0, 16)}`;
    if (signerId !== expectedDID) {
      res.status(400).json({
        error: 'Invalid signerId',
        details: `SignerId must be derived from public key: ${expectedDID}`,
      });
      return;
    }

    const db = getDB();

    // Check if agent already exists
    const existing = db.getAgentByPublicKey(payload.publicKey);

    if (existing) {
      res.status(409).json({
        error: 'Agent already registered',
        details: `Public key already registered`,
      });
      return;
    }

    // Insert agent
    const now = Math.floor(Date.now() / 1000);
    db.insertAgent({
      did: signerId,
      publicKey: payload.publicKey,
      name: payload.name,
      registeredAt: now,
    });

    res.status(201).json({
      did: signerId,
      publicKey: payload.publicKey,
      name: payload.name,
      registeredAt: now,
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to register agent',
      details: (err as Error).message,
    });
  }
});

/**
 * GET /agents - List all agents
 */
router.get('/agents', (req: Request, res: Response) => {
  try {
    const db = getDB();
    const agents = db.getAllAgents().map((a) => ({
      did: a.did,
      publicKey: a.publicKey,
      name: a.name,
      registeredAt: a.registeredAt,
    }));

    res.json({
      agents,
      count: agents.length,
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to list agents',
      details: (err as Error).message,
    });
  }
});

/**
 * GET /agents/:did - Get agent details
 */
router.get('/agents/:did', (req: Request, res: Response) => {
  try {
    const { did } = req.params;
    const db = getDB();

    const agent = db.getAgent(did);

    if (!agent) {
      res.status(404).json({
        error: 'Agent not found',
      });
      return;
    }

    res.json({
      did: agent.did,
      publicKey: agent.publicKey,
      name: agent.name,
      registeredAt: agent.registeredAt,
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to get agent',
      details: (err as Error).message,
    });
  }
});

export default router;

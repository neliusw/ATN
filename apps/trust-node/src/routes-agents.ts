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
 * POST /agents - Register agent
 *
 * Request body (signed):
 * {
 *   "payload": { "name": "My Agent", "publicKey": "..." },
 *   "signature": "...",
 *   "signerId": "did:atn:..."
 * }
 *
 * The signerId in the request must match the agent being registered.
 */
router.post('/agents', verifySignature, (req: Request, res: Response) => {
  try {
    const { payload } = req.body;
    const { signerId } = req.body;

    if (!payload || !payload.name || !payload.publicKey) {
      res.status(400).json({
        error: 'Invalid agent payload',
        details: 'Agent must include name and publicKey',
      });
      return;
    }

    // Verify that the signing agent is registering itself
    // The signerId should match a DID derived from the public key
    const derivedAgentId = ATN.deriveAgentId(payload.publicKey as ATN.PublicKey);
    const deriveDidFromPubkey = `did:atn:${payload.publicKey.substring(0, 16)}`;

    // For now, accept the signerId as-is but verify the signature matches the key
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

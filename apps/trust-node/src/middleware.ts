/**
 * Express middleware for signature verification
 *
 * Design invariant:
 * - All mutations (POST, PUT, PATCH, DELETE) must be signed
 * - Signature is verified against agent's public key from the request
 * - Unsigned requests are rejected
 */

import { Request, Response, NextFunction } from 'express';
import * as ATN from '@atn/core';
import { getDB } from './db';
import { SignedRequestBody } from './types';

/**
 * Extend Express Request to include verified agent info
 */
declare global {
  namespace Express {
    interface Request {
      verifiedAgent?: {
        did: string;
        publicKey: ATN.PublicKey;
      };
    }
  }
}

/**
 * Middleware: Verify signatures on all mutations
 * Skips verification for GET requests and unguarded endpoints
 */
export function verifySignature(req: Request, res: Response, next: NextFunction): void {
  // Skip signature verification for GET requests
  if (req.method === 'GET') {
    next();
    return;
  }

  // Skip signature verification for agent registration (POST /agents)
  // Agent registration is self-signed and doesn't require database lookup
  if (req.method === 'POST' && req.path === '/agents') {
    next();
    return;
  }

  // All other methods (POST, PUT, DELETE) must have valid signatures
  const body = req.body as SignedRequestBody;

  if (!body || !body.signature || !body.signerId || body.payload === undefined) {
    res.status(400).json({
      error: 'Missing required signature fields',
      details: 'Request must include payload, signature, and signerId',
    });
    return;
  }

  try {
    // Get agent's public key from database
    const db = getDB();
    const agent = db.getAgent(body.signerId);

    if (!agent) {
      res.status(401).json({
        error: 'Agent not found',
        details: `Agent ${body.signerId} is not registered`,
      });
      return;
    }

    // Canonicalize the payload
    const canonical = ATN.canonicalize(body.payload);
    const bytes = Buffer.from(canonical, 'utf-8');

    // Verify signature
    const isValid = ATN.verify(bytes, body.signature as ATN.Signature, agent.publicKey as ATN.PublicKey);

    if (!isValid) {
      res.status(401).json({
        error: 'Invalid signature',
        details: 'Signature verification failed',
      });
      return;
    }

    // Store verified agent info on request for use in handlers
    req.verifiedAgent = {
      did: body.signerId as any,
      publicKey: agent.publicKey as ATN.PublicKey,
    };

    next();
  } catch (err) {
    res.status(500).json({
      error: 'Signature verification error',
      details: (err as Error).message,
    });
  }
}

/**
 * Middleware: Require verified agent (for protected endpoints)
 */
export function requireAgent(req: Request, res: Response, next: NextFunction): void {
  if (!req.verifiedAgent) {
    res.status(401).json({
      error: 'Unauthorized',
      details: 'This endpoint requires an agent signature',
    });
    return;
  }

  next();
}

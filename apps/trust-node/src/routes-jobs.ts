/**
 * Job endpoints (core E2E flow)
 *
 * POST   /jobs                    - Create job (signed by client)
 * GET    /jobs                    - List jobs
 * GET    /jobs/:id                - Get job details
 * POST   /jobs/:id/fund           - Fund escrow (signed by client)
 * POST   /jobs/:id/proof          - Submit proof (signed by provider)
 * POST   /jobs/:id/attest         - Submit attestation (signed by witness)
 * GET    /audit/:jobId            - Get audit bundle
 */

import { Router, Request, Response } from 'express';
import * as ATN from '@atn/core';
import { getDB } from './db';
import { verifySignature } from './middleware';

const router = Router();

/**
 * POST /jobs - Create job
 *
 * Request body (signed by client):
 * {
 *   "payload": {
 *     "offerId": "offer_123",
 *     "providerId": "did:atn:...",
 *     "requiredAttestations": 1,
 *     "timeoutSeconds": 3600,
 *     "escrowAmount": 1000
 *   },
 *   "signature": "...",
 *   "signerId": "did:atn:..." (client)
 * }
 */
router.post('/jobs', verifySignature, (req: Request, res: Response) => {
  try {
    const { payload } = req.body;
    const { signerId } = req.body; // signerId is the client

    if (!payload || !payload.offerId || !payload.providerId || !payload.escrowAmount) {
      res.status(400).json({
        error: 'Invalid job payload',
        details: 'Job must include offerId, providerId, and escrowAmount',
      });
      return;
    }

    const db = getDB();

    // Verify offer exists
    const offer = db.getOffer(payload.offerId);
    if (!offer) {
      res.status(404).json({
        error: 'Offer not found',
      });
      return;
    }

    // Verify provider exists
    if (!db.getAgent(payload.providerId)) {
      res.status(404).json({
        error: 'Provider not found',
      });
      return;
    }

    // Verify client exists
    if (!db.getAgent(signerId)) {
      res.status(401).json({
        error: 'Client not found',
      });
      return;
    }

    // Create job
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = Math.floor(Date.now() / 1000);

    db.insertJob({
      id: jobId,
      offerId: payload.offerId,
      clientId: signerId,
      providerId: payload.providerId,
      state: 'CREATED',
      requiredAttestations: payload.requiredAttestations || 1,
      createdAt: now,
      timeoutSeconds: payload.timeoutSeconds || 3600,
      escrowAmount: payload.escrowAmount,
    });

    // Log event
    const eventPayload = {
      type: 'JOB_CREATED',
      jobId,
      clientId: signerId,
      providerId: payload.providerId,
      timestamp: now,
    };
    const eventCanonical = ATN.canonicalize(eventPayload);

    db.insertEventLogEntry({
      jobId,
      eventType: 'JOB_CREATED',
      actor: signerId,
      previousHash: ATN.sha256('GENESIS'),
      payload: eventCanonical,
      signature: req.body.signature,
      createdAt: now,
    });

    res.status(201).json({
      id: jobId,
      offerId: payload.offerId,
      clientId: signerId,
      providerId: payload.providerId,
      state: 'CREATED',
      escrowAmount: payload.escrowAmount,
      createdAt: now,
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to create job',
      details: (err as Error).message,
    });
  }
});

/**
 * GET /jobs - List jobs
 */
router.get('/jobs', (req: Request, res: Response) => {
  try {
    const db = getDB();
    const jobs = db.getAllJobs().map((j) => ({
      id: j.id,
      offerId: j.offerId,
      clientId: j.clientId,
      providerId: j.providerId,
      state: j.state,
      escrowAmount: j.escrowAmount,
      createdAt: j.createdAt,
    }));

    res.json({
      jobs,
      count: jobs.length,
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to list jobs',
      details: (err as Error).message,
    });
  }
});

/**
 * GET /jobs/:id - Get job details
 */
router.get('/jobs/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDB();

    const job = db.getJob(id);

    if (!job) {
      res.status(404).json({
        error: 'Job not found',
      });
      return;
    }

    res.json({
      id: job.id,
      offerId: job.offerId,
      clientId: job.clientId,
      providerId: job.providerId,
      state: job.state,
      requiredAttestations: job.requiredAttestations,
      escrowAmount: job.escrowAmount,
      createdAt: job.createdAt,
      timeoutSeconds: job.timeoutSeconds,
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to get job',
      details: (err as Error).message,
    });
  }
});

/**
 * POST /jobs/:id/fund - Fund escrow
 */
router.post('/jobs/:id/fund', verifySignature, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { signerId } = req.body;

    const db = getDB();
    const job = db.getJob(id);

    if (!job) {
      res.status(404).json({
        error: 'Job not found',
      });
      return;
    }

    // Verify client is funding their own job
    if (job.clientId !== signerId) {
      res.status(403).json({
        error: 'Unauthorized',
        details: 'Only the client can fund the job',
      });
      return;
    }

    // Verify state transition
    if (!ATN.isValidTransition(job.state as any, 'FUNDED' as any)) {
      res.status(409).json({
        error: 'Invalid state transition',
        details: `Cannot transition from ${job.state} to FUNDED`,
      });
      return;
    }

    // Update state
    db.updateJobState(id, 'FUNDED');

    // Log event
    const now = Math.floor(Date.now() / 1000);
    const eventPayload = {
      type: 'JOB_FUNDED',
      jobId: id,
      clientId: signerId,
      amount: job.escrowAmount,
      timestamp: now,
    };

    db.insertEventLogEntry({
      jobId: id,
      eventType: 'JOB_FUNDED',
      actor: signerId,
      previousHash: ATN.sha256('GENESIS'), // TODO: use actual previous hash
      payload: ATN.canonicalize(eventPayload),
      signature: req.body.signature,
      createdAt: now,
    });

    res.json({
      id,
      state: 'FUNDED',
      message: 'Job funded successfully',
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to fund job',
      details: (err as Error).message,
    });
  }
});

/**
 * POST /jobs/:id/proof - Submit proof
 */
router.post('/jobs/:id/proof', verifySignature, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { payload, signerId } = req.body;

    const db = getDB();
    const job = db.getJob(id);

    if (!job) {
      res.status(404).json({
        error: 'Job not found',
      });
      return;
    }

    // Verify provider is submitting
    if (job.providerId !== signerId) {
      res.status(403).json({
        error: 'Unauthorized',
        details: 'Only the provider can submit proof',
      });
      return;
    }

    // Verify state transition
    if (!ATN.isValidTransition(job.state as any, 'PROVED' as any)) {
      res.status(409).json({
        error: 'Invalid state transition',
        details: `Cannot transition from ${job.state} to PROVED`,
      });
      return;
    }

    // Update state
    db.updateJobState(id, 'PROVED');

    // Log event
    const now = Math.floor(Date.now() / 1000);
    const eventPayload = {
      type: 'JOB_PROVED',
      jobId: id,
      providerId: signerId,
      proofHash: payload.proofHash || 'N/A',
      timestamp: now,
    };

    db.insertEventLogEntry({
      jobId: id,
      eventType: 'JOB_PROVED',
      actor: signerId,
      previousHash: ATN.sha256('GENESIS'), // TODO: use actual previous hash
      payload: ATN.canonicalize(eventPayload),
      signature: req.body.signature,
      createdAt: now,
    });

    res.json({
      id,
      state: 'PROVED',
      message: 'Proof submitted successfully',
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to submit proof',
      details: (err as Error).message,
    });
  }
});

/**
 * POST /jobs/:id/attest - Submit attestation
 */
router.post('/jobs/:id/attest', verifySignature, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { payload, signerId } = req.body;

    const db = getDB();
    const job = db.getJob(id);

    if (!job) {
      res.status(404).json({
        error: 'Job not found',
      });
      return;
    }

    // Verify state transition
    if (!ATN.isValidTransition(job.state as any, 'ATTESTED' as any)) {
      res.status(409).json({
        error: 'Invalid state transition',
        details: `Cannot transition from ${job.state} to ATTESTED`,
      });
      return;
    }

    // Update state
    db.updateJobState(id, 'ATTESTED');

    // Log event
    const now = Math.floor(Date.now() / 1000);
    const eventPayload = {
      type: 'JOB_ATTESTED',
      jobId: id,
      witnessId: signerId,
      attestationType: payload.attestationType || 'DELIVERED_OK',
      timestamp: now,
    };

    db.insertEventLogEntry({
      jobId: id,
      eventType: 'JOB_ATTESTED',
      actor: signerId,
      previousHash: ATN.sha256('GENESIS'), // TODO: use actual previous hash
      payload: ATN.canonicalize(eventPayload),
      signature: req.body.signature,
      createdAt: now,
    });

    res.json({
      id,
      state: 'ATTESTED',
      message: 'Attestation submitted successfully',
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to submit attestation',
      details: (err as Error).message,
    });
  }
});

/**
 * GET /audit/:jobId - Get audit bundle
 */
router.get('/audit/:jobId', (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const db = getDB();

    const job = db.getJob(jobId);

    if (!job) {
      res.status(404).json({
        error: 'Job not found',
      });
      return;
    }

    const events = db.getEventLogEntriesByJobId(jobId);

    res.json({
      jobId,
      job,
      events: events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        actor: e.actor,
        previousHash: e.previousHash,
        signature: e.signature,
        createdAt: e.createdAt,
      })),
      eventCount: events.length,
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to retrieve audit bundle',
      details: (err as Error).message,
    });
  }
});

export default router;

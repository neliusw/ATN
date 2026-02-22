/**
 * Offer endpoints
 *
 * POST   /offers           - Publish offer (signed by provider)
 * GET    /offers           - List all offers (filterable by capability)
 * GET    /offers/:id       - Get offer details
 */

import { Router, Request, Response } from 'express';
import { getDB } from './db';
import { verifySignature } from './middleware';

const router = Router();

/**
 * POST /offers - Publish offer
 *
 * Request body (signed):
 * {
 *   "payload": {
 *     "capability": "dns_audit",
 *     "description": "...",
 *     "inputSchema": {...},
 *     "outputSchema": {...},
 *     "pricePerJob": 1000
 *   },
 *   "signature": "...",
 *   "signerId": "did:atn:..."
 * }
 */
router.post('/offers', verifySignature, (req: Request, res: Response) => {
  try {
    const { payload } = req.body;
    const { signerId } = req.body;

    if (!payload || !payload.capability || !payload.description || !payload.pricePerJob) {
      res.status(400).json({
        error: 'Invalid offer payload',
        details: 'Offer must include capability, description, and pricePerJob',
      });
      return;
    }

    const db = getDB();

    // Verify provider exists
    const provider = db.getAgent(signerId);
    if (!provider) {
      res.status(401).json({
        error: 'Agent not found',
        details: `Provider ${signerId} is not registered`,
      });
      return;
    }

    // Generate offer ID
    const offerId = `offer_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = Math.floor(Date.now() / 1000);

    // Insert offer
    db.insertOffer({
      id: offerId,
      providerId: signerId,
      capability: payload.capability,
      description: payload.description,
      inputSchema: JSON.stringify(payload.inputSchema || {}),
      outputSchema: JSON.stringify(payload.outputSchema || {}),
      pricePerJob: payload.pricePerJob,
      publishedAt: now,
    });

    res.status(201).json({
      id: offerId,
      providerId: signerId,
      capability: payload.capability,
      description: payload.description,
      pricePerJob: payload.pricePerJob,
      publishedAt: now,
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to publish offer',
      details: (err as Error).message,
    });
  }
});

/**
 * GET /offers - List all offers
 * Query params: ?capability=dns_audit (optional filter)
 */
router.get('/offers', (req: Request, res: Response) => {
  try {
    const { capability } = req.query;
    const db = getDB();

    let offers = db.getAllOffers();

    if (capability) {
      offers = db.getOffersByCapability(capability as string);
    }

    const result = offers.map((o) => ({
      id: o.id,
      providerId: o.providerId,
      capability: o.capability,
      description: o.description,
      pricePerJob: o.pricePerJob,
      publishedAt: o.publishedAt,
    }));

    res.json({
      offers: result,
      count: result.length,
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to list offers',
      details: (err as Error).message,
    });
  }
});

/**
 * GET /offers/:id - Get offer details
 */
router.get('/offers/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDB();

    const offer = db.getOffer(id);

    if (!offer) {
      res.status(404).json({
        error: 'Offer not found',
      });
      return;
    }

    res.json({
      id: offer.id,
      providerId: offer.providerId,
      capability: offer.capability,
      description: offer.description,
      inputSchema: JSON.parse(offer.inputSchema),
      outputSchema: JSON.parse(offer.outputSchema),
      pricePerJob: offer.pricePerJob,
      publishedAt: offer.publishedAt,
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to get offer',
      details: (err as Error).message,
    });
  }
});

export default router;

/**
 * trust-node - ATN REST API server
 *
 * V0.1 minimal server for:
 * - Agent registration and lookup
 * - Offer publishing
 * - Job lifecycle management
 * - Tamper-evident event logging
 * - Audit bundle retrieval
 */

import express from 'express';
import { initializeDB, closeDB } from './db';
import { verifySignature } from './middleware';
import agentsRouter from './routes-agents';
import offersRouter from './routes-offers';
import jobsRouter from './routes-jobs';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const DB_PATH = process.env.DB_PATH || ':memory:';

const app = express();

// Middleware
app.use(express.json());
app.use(verifySignature);

// Initialize database on startup
initializeDB(DB_PATH);

// Routes
app.get('/', (req, res) => {
  res.json({
    name: 'ATN Trust Node',
    version: '0.1.0',
    description: 'Cryptographic substrate for agent coordination',
  });
});

app.use(agentsRouter);
app.use(offersRouter);
app.use(jobsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
  });
});

// Start server only if this is the main module
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`\n✓ ATN Trust Node listening on port ${PORT}`);
    console.log(`  Database: ${DB_PATH}`);
    console.log(`  API: http://localhost:${PORT}\n`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
      closeDB();
      process.exit(0);
    });
  });
}

export default app;

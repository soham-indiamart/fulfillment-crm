import { Router } from 'express';
import type { Db } from '../db/pool.js';

/**
 * Probes for load balancers and orchestrators: /healthz says the process is up (liveness),
 * /readyz that it can reach the database (readiness).
 */
export function healthRouter(db: Db): Router {
  const router = Router();

  router.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });

  router.get('/readyz', async (req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({ status: 'ready' });
    } catch (err) {
      req.log.warn({ err }, 'Readiness check failed');
      res.status(503).json({ status: 'unavailable' });
    }
  });

  return router;
}

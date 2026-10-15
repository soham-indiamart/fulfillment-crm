import { Router } from 'express';
import type { SummaryService } from './service.js';

/** /api/summary?from=YYYY-MM-DD&to=YYYY-MM-DD — per-day BL funnel and deletions. */
export function summaryRouter(service: SummaryService): Router {
  const router = Router();
  router.get('/', async (req, res) => {
    res.json(await service.get(req.query));
  });
  return router;
}

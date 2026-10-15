import { Router } from 'express';
import multer from 'multer';
import type { OffersService } from './service.js';

/** /api/offers — list (paged), edit fields, mark fulfilled (multipart: remarks + optional file). */
export function offersRouter(service: OffersService, { maxUploadBytes }: { maxUploadBytes: number }): Router {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxUploadBytes, files: 1, fields: 4, fieldSize: 16 * 1024 },
  });
  const router = Router();

  router.get('/', async (req, res) => {
    res.json(await service.list(req.query));
  });

  router.patch('/:offerId', async (req, res) => {
    res.json(await service.update(req.params.offerId, req.body?.changes));
  });

  router.post('/:offerId/fulfillment', upload.single('file'), async (req, res) => {
    const file = req.file && {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      bytes: req.file.buffer,
    };
    res.json(await service.fulfil(req.params.offerId, { remarks: req.body?.remarks, file }));
  });

  return router;
}

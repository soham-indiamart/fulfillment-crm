import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import type { ApiErrorBody } from '../shared/api.js';
import { HttpError } from './errors.js';

export const apiNotFound: RequestHandler = (_req, _res, next) => next(new HttpError(404, 'Not found'));

function toHttpError(err: unknown): HttpError {
  if (err instanceof HttpError) return err;
  if (err instanceof multer.MulterError) {
    return new HttpError(
      err.code === 'LIMIT_FILE_SIZE' ? 413 : 400,
      err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : err.message,
    );
  }
  const { type, status } = (err ?? {}) as { type?: string; status?: number };
  if (type === 'entity.too.large') return new HttpError(413, 'Request body is too large');
  if (type === 'entity.parse.failed') return new HttpError(400, 'Request body is not valid JSON');
  // Client errors raised by Express itself (e.g. a missing stored file) keep their status.
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return new HttpError(status, status === 404 ? 'Not found' : 'Bad request');
  }
  return new HttpError(500, 'Something went wrong');
}

/**
 * Last middleware: every failure becomes `{ error }` JSON. Server faults are never echoed; the
 * request logger records them (with stack) on its one line per request via `res.err`.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const httpError = toHttpError(err);
  if (httpError.status >= 500) res.err = err instanceof Error ? err : new Error(String(err));
  if (res.headersSent) return;
  const body: ApiErrorBody = { error: httpError.message };
  res.status(httpError.status).json(body);
};

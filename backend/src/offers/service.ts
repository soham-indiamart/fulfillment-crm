// Offer business rules: paging, which fields may change and to what, and fulfilment.
import path from 'node:path';
import { EDITABLE_FIELDS, OFFERS_PAGE_SIZE, type EditableField, type Offer, type OffersPage } from '../shared/api.js';
import { badRequest, notFound } from '../http/errors.js';
import { parseOfferId, parsePositiveInt } from '../lib/parse.js';
import type { FileStorage } from '../storage/types.js';
import { OFFER_FIELDS, encodeValue } from './fields.js';
import type { OfferValues, OffersRepository } from './repository.js';

export const UPLOAD_EXTENSIONS: ReadonlySet<string> = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
]);

export interface UploadedFile {
  originalName: string;
  mimeType: string;
  bytes: Buffer;
}

export interface OffersService {
  list(query: { page?: unknown; pageSize?: unknown }): Promise<OffersPage>;
  update(offerId: unknown, changes: unknown): Promise<Offer>;
  fulfil(offerId: unknown, input: { remarks?: unknown; file?: UploadedFile }): Promise<Offer>;
}

const isEditable = (key: string): key is EditableField => (EDITABLE_FIELDS as readonly string[]).includes(key);

/** Validates a PATCH body field by field against OFFER_FIELDS and returns database values. */
function encodeChanges(changes: unknown): OfferValues {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) throw badRequest('Nothing to update');
  const values: OfferValues = {};
  for (const [key, value] of Object.entries(changes)) {
    if (!isEditable(key)) throw badRequest(`${key} cannot be edited`);
    const spec = OFFER_FIELDS[key];
    if (spec.type === 'flag' && typeof value !== 'boolean') throw badRequest(`${key} must be true or false`);
    if (spec.type === 'text' && typeof value !== 'string') throw badRequest(`${key} must be text`);
    const encoded = encodeValue(spec, value);
    if (spec.allowed && !spec.allowed.includes(encoded ?? '')) {
      throw badRequest(`"${encoded}" is not a valid ${spec.column}`);
    }
    if (spec.maxLength && (encoded?.length ?? 0) > spec.maxLength) {
      throw badRequest(`${key} must be at most ${spec.maxLength} characters`);
    }
    values[key] = encoded;
  }
  if (!Object.keys(values).length) throw badRequest('Nothing to update');
  return values;
}

export function createOffersService({
  repo,
  storage,
}: {
  repo: OffersRepository;
  storage: FileStorage;
}): OffersService {
  async function updateExisting(offerId: string, values: OfferValues): Promise<Offer> {
    const offer = await repo.update(offerId, values);
    if (!offer) throw notFound(`Offer ${offerId} is not in the database`);
    return offer;
  }

  return {
    async list(query) {
      const page = parsePositiveInt(query.page, 1, 'page');
      const pageSize = Math.min(
        parsePositiveInt(query.pageSize, OFFERS_PAGE_SIZE.default, 'pageSize'),
        OFFERS_PAGE_SIZE.max,
      );
      const [items, stats, importedAt] = await Promise.all([
        repo.list(pageSize, (page - 1) * pageSize),
        repo.stats(),
        repo.lastImportAt(),
      ]);
      return { items, page, pageSize, stats, importedAt, fetchedAt: new Date().toISOString() };
    },

    async update(rawOfferId, changes) {
      return updateExisting(parseOfferId(rawOfferId), encodeChanges(changes));
    },

    async fulfil(rawOfferId, { remarks, file }) {
      const offerId = parseOfferId(rawOfferId);
      const text = typeof remarks === 'string' ? remarks.trim() : '';
      if (!text) throw badRequest('A comment is required to mark this offer as fulfilled');
      if (text.length > (OFFER_FIELDS.fulfillmentRemarks.maxLength ?? Infinity)) {
        throw badRequest('The comment is too long');
      }

      const values: OfferValues = {
        progress: 'Fulfilled',
        fulfillmentFlag: encodeValue(OFFER_FIELDS.fulfillmentFlag, true),
        fulfillmentRemarks: text,
      };

      if (file) {
        if (!UPLOAD_EXTENSIONS.has(path.extname(file.originalName).toLowerCase())) {
          throw badRequest('Upload a PDF, image, Word or Excel file');
        }
        if (!file.bytes.length) throw badRequest('The uploaded file is empty');
        // Check first so a mistyped offer ID never leaves an orphaned file behind.
        if (!(await repo.exists(offerId))) throw notFound(`Offer ${offerId} is not in the database`);
        const stored = await storage.save(
          { name: file.originalName, contentType: file.mimeType, bytes: file.bytes },
          offerId,
        );
        values.quotation = stored.url;
      }

      return updateExisting(offerId, values);
    },
  };
}

import type { RequestHandler } from 'express';

export interface FileToStore {
  name: string;
  contentType: string;
  bytes: Buffer;
}

export interface StoredFile {
  /** Where the dashboard links to the file. */
  url: string;
}

/**
 * Where uploaded quotation files live. LocalFileStorage keeps them on this server's disk; an
 * object-storage implementation (S3) can replace it without touching the offers code.
 */
export interface FileStorage {
  save(file: FileToStore, keyPrefix: string): Promise<StoredFile>;
  /** Set by storages that serve their own files through this server. */
  readonly route?: { path: string; handler: RequestHandler };
}

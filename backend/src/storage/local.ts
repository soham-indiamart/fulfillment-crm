import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import type { FileStorage, FileToStore, StoredFile } from './types.js';

/** Keeps the original name readable while making it safe as a single path segment. */
export const sanitizeFileName = (name: string): string =>
  path
    .basename(name)
    .replace(/[^\w.-]+/g, '_')
    .slice(-100) || 'file';

/**
 * Uploads on this server's disk, served at `publicPath`. Fine for one instance; with several
 * instances (or a disk wiped on deploy) use object storage instead.
 */
export class LocalFileStorage implements FileStorage {
  readonly route: FileStorage['route'];
  readonly #dir: string;
  readonly #publicPath: string;

  constructor(dir: string, publicPath = '/uploads') {
    this.#dir = dir;
    this.#publicPath = publicPath;
    this.route = {
      path: publicPath,
      handler: express.static(dir, { index: false, fallthrough: false, dotfiles: 'deny', maxAge: '1d' }),
    };
  }

  async save(file: FileToStore, keyPrefix: string): Promise<StoredFile> {
    await fs.mkdir(this.#dir, { recursive: true });
    const name = `${keyPrefix}-${Date.now()}-${randomUUID().slice(0, 8)}-${sanitizeFileName(file.name)}`;
    await fs.writeFile(path.join(this.#dir, name), file.bytes, { flag: 'wx' });
    return { url: `${this.#publicPath}/${encodeURIComponent(name)}` };
  }
}

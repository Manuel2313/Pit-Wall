import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { StorageAdapter } from './storage-adapter.interface';
import { FileNotFound } from './file-not-found.error';

export class FsStorageAdapter implements StorageAdapter {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = resolve(basePath);
  }

  async put(key: string, data: Buffer): Promise<void> {
    const filePath = this.resolvePath(key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
  }

  async get(key: string): Promise<Buffer> {
    const filePath = this.resolvePath(key);
    try {
      return await readFile(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new FileNotFound(key);
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolvePath(key);
    try {
      await unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  private resolvePath(key: string): string {
    const resolved = resolve(this.basePath, key);
    if (resolved !== this.basePath && !resolved.startsWith(this.basePath + sep)) {
      throw new Error(`Invalid storage key: path traversal detected (${key})`);
    }
    return resolved;
  }
}
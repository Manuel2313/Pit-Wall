import { mkdir, writeFile, readFile, unlink, rm } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
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
    return join(this.basePath, key);
  }
}
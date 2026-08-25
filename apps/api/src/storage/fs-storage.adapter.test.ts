import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { FsStorageAdapter } from './fs-storage.adapter';
import { FileNotFound } from './file-not-found.error';
import { StorageAdapter } from './storage-adapter.interface';

describe('FsStorageAdapter', () => {
  let adapter: StorageAdapter;
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `pit-wall-storage-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
    adapter = new FsStorageAdapter(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('round-trip', () => {
    it('should put a buffer and get it back with exact byte equality', async () => {
      const key = 'test/round-trip.sto';
      const data = Buffer.from([0x01, 0x02, 0x03, 0xff, 0xfe, 0xfd]);

      await adapter.put(key, data);
      const retrieved = await adapter.get(key);

      expect(retrieved).toEqual(data);
      expect(Buffer.compare(retrieved, data)).toBe(0);
    });

    it('should handle empty buffer', async () => {
      const key = 'test/empty.sto';
      const data = Buffer.alloc(0);

      await adapter.put(key, data);
      const retrieved = await adapter.get(key);

      expect(retrieved).toEqual(data);
      expect(retrieved.length).toBe(0);
    });

    it('should handle large buffer', async () => {
      const key = 'test/large.sto';
      const data = Buffer.alloc(1024 * 1024, 0xab); // 1MB

      await adapter.put(key, data);
      const retrieved = await adapter.get(key);

      expect(retrieved).toEqual(data);
      expect(retrieved.length).toBe(1024 * 1024);
    });
  });

  describe('FileNotFound', () => {
    it('should throw FileNotFound with code FILE_NOT_FOUND for nonexistent key', async () => {
      const key = 'nonexistent/file.sto';

      await expect(adapter.get(key)).rejects.toThrow(FileNotFound);

      try {
        await adapter.get(key);
      } catch (error) {
        expect(error).toBeInstanceOf(FileNotFound);
        expect((error as FileNotFound).code).toBe('FILE_NOT_FOUND');
        expect((error as FileNotFound).message).toBe(`File not found: ${key}`);
      }
    });
  });

  describe('delete', () => {
    it('should delete an existing file', async () => {
      const key = 'test/to-delete.sto';
      const data = Buffer.from('hello');

      await adapter.put(key, data);
      await adapter.delete(key);

      await expect(adapter.get(key)).rejects.toThrow(FileNotFound);
    });

    it('should be no-op for nonexistent key (does not throw)', async () => {
      const key = 'nonexistent/file.sto';

      await expect(adapter.delete(key)).resolves.toBeUndefined();
    });
  });

  describe('overwrite', () => {
    it('should overwrite existing key with new value', async () => {
      const key = 'test/overwrite.sto';
      const firstData = Buffer.from('first');
      const secondData = Buffer.from('second');

      await adapter.put(key, firstData);
      await adapter.put(key, secondData);
      const retrieved = await adapter.get(key);

      expect(retrieved).toEqual(secondData);
      expect(retrieved).not.toEqual(firstData);
    });
  });

  describe('directory creation', () => {
    it('should create nested directories as needed', async () => {
      const key = 'deeply/nested/directory/structure/file.sto';
      const data = Buffer.from('nested');

      await adapter.put(key, data);
      const retrieved = await adapter.get(key);

      expect(retrieved).toEqual(data);
    });
  });
});
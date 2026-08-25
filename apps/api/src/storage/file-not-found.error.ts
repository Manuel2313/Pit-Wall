export class FileNotFound extends Error {
  readonly code = 'FILE_NOT_FOUND' as const;

  constructor(key: string) {
    super(`File not found: ${key}`);
    this.name = 'FileNotFound';
  }
}
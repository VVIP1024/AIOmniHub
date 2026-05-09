import fs from 'fs';
import path from 'path';

export function shouldUseVercelStorage(): boolean {
  return process.env.NODE_ENV === 'production';
}

function findStorageRoot(): string {
  const candidates = [
    path.join(process.cwd(), 'storage'),
    path.join(process.cwd(), '..', '..', 'storage'),
    path.join(process.cwd(), '..', 'storage'),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

export function getLocalStoragePath(...segments: string[]): string {
  return path.join(findStorageRoot(), ...segments);
}

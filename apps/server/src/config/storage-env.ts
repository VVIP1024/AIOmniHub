import fs from 'fs';
import path from 'path';

export function shouldUseVercelStorage(): boolean {
  return process.env.NODE_ENV === 'production';
}

function findWorkspaceRoot(): string {
  const candidates = [
    process.cwd(),
    path.join(process.cwd(), '..', '..'),
    path.join(process.cwd(), '..'),
  ];

  return candidates.find((candidate) => fs.existsSync(path.join(candidate, 'storage'))) ?? candidates[0];
}

export function getLocalStoragePath(...segments: string[]): string {
  return path.join(findWorkspaceRoot(), 'storage', ...segments);
}

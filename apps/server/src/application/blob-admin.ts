import { del, put } from '@vercel/blob';
import type { BlobDeleteResult, BlobPutInput, BlobPutResult } from '../types.js';

function normalizePathname(pathname: string): string {
  return pathname
    .split('/')
    .filter((segment) => segment && segment !== '.' && segment !== '..')
    .join('/');
}

export async function putBlob(input: BlobPutInput): Promise<BlobPutResult> {
  const pathname = normalizePathname(input.pathname);
  if (!pathname) {
    throw new Error('Invalid blob pathname');
  }

  const blob = await put(pathname, input.content, {
    access: 'private',
    contentType: input.contentType,
    allowOverwrite: true,
  });

  return {
    pathname: blob.pathname,
    url: blob.url,
  };
}

export async function deleteBlob(pathname: string): Promise<BlobDeleteResult> {
  const normalizedPathname = normalizePathname(pathname);
  if (!normalizedPathname) {
    throw new Error('Invalid blob pathname');
  }

  await del(normalizedPathname);
  return {
    pathname: normalizedPathname,
    deleted: true,
  };
}

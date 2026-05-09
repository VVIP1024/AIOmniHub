export interface SaveBlobInput {
  pathname: string;
  content: string;
  contentType?: string;
  token: string;
}

export interface DeleteBlobInput {
  pathname: string;
  token: string;
}

export async function saveBlob(input: SaveBlobInput): Promise<{ pathname: string; url: string }> {
  const response = await fetch('/api/blob', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pathname: input.pathname,
      content: input.content,
      contentType: input.contentType,
    }),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(error?.error || `Blob 保存失败：${response.status}`);
  }

  return response.json() as Promise<{ pathname: string; url: string }>;
}

export async function deleteBlob(input: DeleteBlobInput): Promise<{ pathname: string; deleted: boolean }> {
  const response = await fetch('/api/blob', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${input.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pathname: input.pathname,
    }),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(error?.error || `Blob 删除失败：${response.status}`);
  }

  return response.json() as Promise<{ pathname: string; deleted: boolean }>;
}

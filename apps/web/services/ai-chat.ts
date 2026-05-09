export type AiChatRole = 'system' | 'user' | 'assistant';

export interface AiChatMessage {
  role: AiChatRole;
  content: string;
}

export interface AiChatRequest {
  prompt?: string;
  messages?: AiChatMessage[];
  model?: string;
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface AiChatResponse {
  text: string;
  model: string;
  usage?: unknown;
  finishReason?: string;
}

export async function requestAiChat(input: AiChatRequest): Promise<AiChatResponse> {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(error?.error || `AI 网关请求失败：${response.status}`);
  }

  return response.json() as Promise<AiChatResponse>;
}

import { generateText } from 'ai';
import { getAiGatewayConfig, getAiGatewayModel } from '../config/ai-gateway.js';
import type { AiChatConfigResponse, AiChatMessage, AiChatRequest, AiChatResponse } from '../types.js';

function isChatMessage(value: unknown): value is AiChatMessage {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as AiChatMessage;
  return (
    (candidate.role === 'system' || candidate.role === 'user' || candidate.role === 'assistant') &&
    typeof candidate.content === 'string' &&
    candidate.content.trim().length > 0
  );
}

function toPrompt(body: AiChatRequest): { prompt: string; system?: string } | null {
  if (typeof body.prompt === 'string' && body.prompt.trim()) {
    return {
      prompt: body.prompt.trim(),
      system: typeof body.system === 'string' && body.system.trim() ? body.system.trim() : undefined,
    };
  }

  if (!Array.isArray(body.messages)) return null;

  const messages = body.messages.filter(isChatMessage);
  if (messages.length === 0) return null;

  const systemMessages = messages.filter((message) => message.role === 'system').map((message) => message.content);
  const conversation = messages
    .filter((message) => message.role !== 'system')
    .map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`)
    .join('\n\n');

  return {
    prompt: conversation,
    system: typeof body.system === 'string' && body.system.trim() ? body.system.trim() : systemMessages.join('\n\n') || undefined,
  };
}

function toOptionalNumber(value: unknown, min: number, max: number): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(max, Math.max(min, parsed));
}

export function getAiChatConfig(): AiChatConfigResponse {
  const config = getAiGatewayConfig();
  return {
    provider: config.provider,
    model: config.model,
    baseUrlConfigured: Boolean(config.baseUrl),
    maxOutputTokens: config.maxOutputTokens,
    temperature: config.temperature,
  };
}

export async function generateAiChat(input: AiChatRequest): Promise<AiChatResponse> {
  const prompt = toPrompt(input);
  if (!prompt) {
    throw new Error('Missing prompt or messages');
  }

  const config = getAiGatewayConfig();
  const model = typeof input.model === 'string' && input.model.trim() ? input.model.trim() : config.model;
  const temperature = toOptionalNumber(input.temperature, 0, 2) ?? config.temperature;
  const maxOutputTokens = toOptionalNumber(input.maxOutputTokens, 1, 8000) ?? config.maxOutputTokens;

  const result = await generateText({
    model: getAiGatewayModel(model),
    system: prompt.system || config.systemPrompt,
    prompt: prompt.prompt,
    temperature,
    maxOutputTokens,
  });

  return {
    text: result.text,
    provider: config.provider,
    model,
    usage: result.usage,
    finishReason: result.finishReason,
  };
}

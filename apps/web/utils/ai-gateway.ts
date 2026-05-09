import { createOpenAI } from '@ai-sdk/openai';
import { createGateway } from 'ai';

type AiGatewayProvider = 'vercel' | 'openai-compatible';

export interface AiGatewayConfig {
  provider: AiGatewayProvider;
  model: string;
  baseUrl?: string;
  systemPrompt: string;
  temperature: number;
  maxOutputTokens: number;
}

const DEFAULT_MODEL = 'openai/gpt-4o-mini';
const DEFAULT_SYSTEM_PROMPT = 'You are a concise AI assistant for AI Omni Hub.';
const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_OUTPUT_TOKENS = 1200;

function parseNumber(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function getProvider(): AiGatewayProvider {
  return process.env.AI_GATEWAY_PROVIDER === 'openai-compatible' ? 'openai-compatible' : 'vercel';
}

export function getAiGatewayConfig(): AiGatewayConfig {
  return {
    provider: getProvider(),
    model: process.env.AI_GATEWAY_MODEL || DEFAULT_MODEL,
    baseUrl: process.env.AI_GATEWAY_BASE_URL,
    systemPrompt: process.env.AI_GATEWAY_SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT,
    temperature: parseNumber(process.env.AI_GATEWAY_TEMPERATURE, DEFAULT_TEMPERATURE, 0, 2),
    maxOutputTokens: parseNumber(
      process.env.AI_GATEWAY_MAX_OUTPUT_TOKENS,
      DEFAULT_MAX_OUTPUT_TOKENS,
      1,
      8000,
    ),
  };
}

export function getAiGatewayModel(model?: string) {
  const config = getAiGatewayConfig();
  const selectedModel = model || config.model;

  if (config.provider === 'openai-compatible') {
    if (!config.baseUrl) {
      throw new Error('AI_GATEWAY_BASE_URL is required when AI_GATEWAY_PROVIDER=openai-compatible');
    }

    const provider = createOpenAI({
      apiKey: process.env.AI_GATEWAY_API_KEY,
      baseURL: config.baseUrl,
    });

    return provider(selectedModel);
  }

  const gateway = createGateway(
    process.env.AI_GATEWAY_API_KEY
      ? {
          apiKey: process.env.AI_GATEWAY_API_KEY,
        }
      : {},
  );

  return gateway(selectedModel);
}

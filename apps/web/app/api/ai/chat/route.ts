import { generateText } from 'ai';
import { NextResponse } from 'next/server';
import { getAiGatewayConfig, getAiGatewayModel } from '@/utils/ai-gateway';

type ChatRole = 'system' | 'user' | 'assistant';

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface ChatRequestBody {
  prompt?: unknown;
  messages?: unknown;
  model?: unknown;
  system?: unknown;
  temperature?: unknown;
  maxOutputTokens?: unknown;
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as ChatMessage;
  return (
    (candidate.role === 'system' || candidate.role === 'user' || candidate.role === 'assistant') &&
    typeof candidate.content === 'string' &&
    candidate.content.trim().length > 0
  );
}

function toPrompt(body: ChatRequestBody): { prompt: string; system?: string } | null {
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
    system:
      typeof body.system === 'string' && body.system.trim()
        ? body.system.trim()
        : systemMessages.join('\n\n') || undefined,
  };
}

function toOptionalNumber(value: unknown, min: number, max: number): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(max, Math.max(min, parsed));
}

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = getAiGatewayConfig();

  return NextResponse.json({
    provider: config.provider,
    model: config.model,
    baseUrlConfigured: Boolean(config.baseUrl),
    maxOutputTokens: config.maxOutputTokens,
    temperature: config.temperature,
  });
}

export async function POST(request: Request) {
  let body: ChatRequestBody;

  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const input = toPrompt(body);
  if (!input) {
    return NextResponse.json({ error: 'Missing prompt or messages' }, { status: 400 });
  }

  const config = getAiGatewayConfig();
  const model = typeof body.model === 'string' && body.model.trim() ? body.model.trim() : config.model;
  const temperature = toOptionalNumber(body.temperature, 0, 2) ?? config.temperature;
  const maxOutputTokens =
    toOptionalNumber(body.maxOutputTokens, 1, 8000) ?? config.maxOutputTokens;

  try {
    const result = await generateText({
      model: getAiGatewayModel(model),
      system: input.system || config.systemPrompt,
      prompt: input.prompt,
      temperature,
      maxOutputTokens,
    });

    return NextResponse.json({
      text: result.text,
      provider: config.provider,
      model,
      usage: result.usage,
      finishReason: result.finishReason,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI gateway request failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

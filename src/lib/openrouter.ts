const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-haiku-4-5';
const TIMEOUT_MS = 60_000;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatReply {
  content: string;
  toolCalls: ToolCall[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(import.meta.env.VITE_OPENROUTER_API_KEY);
}

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterToolCall {
  id?: string;
  index?: number;
  type?: 'function';
  function?: { name?: string; arguments?: string };
}

interface OpenRouterChoiceMessage {
  content?: string | null;
  tool_calls?: OpenRouterToolCall[];
}

function parseArgs(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

function buildPayload(
  messages: ChatMessage[],
  systemPrompt: string,
  tools: ToolDefinition[] | undefined,
  stream: boolean
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ] satisfies OpenRouterMessage[],
    stream,
  };
  if (tools && tools.length > 0) {
    payload.tools = tools.map((t) => ({ type: 'function', function: t }));
  }
  return payload;
}

function buildHeaders(): Record<string, string> {
  const key = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!key) throw new Error('VITE_OPENROUTER_API_KEY manquante');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
    'HTTP-Referer': window.location.origin,
    'X-Title': 'DeVault',
  };
}

export async function sendMessage(
  messages: ChatMessage[],
  systemPrompt: string,
  tools?: ToolDefinition[]
): Promise<ChatReply> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: buildHeaders(),
      body: JSON.stringify(buildPayload(messages, systemPrompt, tools, false)),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: OpenRouterChoiceMessage }[];
    };
    const message = json.choices?.[0]?.message;
    const content = (message?.content ?? '').trim();
    const toolCalls: ToolCall[] = (message?.tool_calls ?? []).map((tc) => ({
      id: tc.id ?? '',
      name: tc.function?.name ?? '',
      arguments: parseArgs(tc.function?.arguments ?? ''),
    }));

    if (!content && toolCalls.length === 0) {
      throw new Error('Réponse vide.');
    }
    return { content, toolCalls };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Timeout. Réessaie.');
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Streaming version. Calls `onContentDelta(chunk)` as content tokens arrive.
 * Tool calls (if any) are returned in the final result, not streamed live.
 */
export async function streamMessage(
  messages: ChatMessage[],
  systemPrompt: string,
  tools: ToolDefinition[] | undefined,
  onContentDelta: (delta: string) => void
): Promise<ChatReply> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);

  let fullContent = '';
  // index → partial accumulator
  const partialTools = new Map<
    number,
    { id: string; name: string; argsBuf: string }
  >();

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: buildHeaders(),
      body: JSON.stringify(buildPayload(messages, systemPrompt, tools, true)),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 200)}`);
    }
    if (!res.body) throw new Error('Pas de flux de réponse.');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE messages are separated by double newline.
      let sepIdx;
      while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, sepIdx);
        buffer = buffer.slice(sepIdx + 2);
        for (const line of block.split('\n')) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const json = JSON.parse(data) as {
              choices?: {
                delta?: {
                  content?: string;
                  tool_calls?: OpenRouterToolCall[];
                };
              }[];
            };
            const delta = json.choices?.[0]?.delta;
            if (!delta) continue;
            if (typeof delta.content === 'string' && delta.content) {
              fullContent += delta.content;
              onContentDelta(delta.content);
            }
            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                const cur = partialTools.get(idx) ?? {
                  id: '',
                  name: '',
                  argsBuf: '',
                };
                if (tc.id) cur.id = tc.id;
                if (tc.function?.name) cur.name = tc.function.name;
                if (tc.function?.arguments) cur.argsBuf += tc.function.arguments;
                partialTools.set(idx, cur);
              }
            }
          } catch {
            // ignore malformed chunks
          }
        }
      }
    }

    const toolCalls: ToolCall[] = Array.from(partialTools.values())
      .filter((t) => t.name)
      .map((t) => ({
        id: t.id,
        name: t.name,
        arguments: parseArgs(t.argsBuf),
      }));

    if (!fullContent.trim() && toolCalls.length === 0) {
      throw new Error('Réponse vide.');
    }
    return { content: fullContent.trim(), toolCalls };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Timeout. Réessaie.');
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}

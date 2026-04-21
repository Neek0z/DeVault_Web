const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-haiku-4-5';
const TIMEOUT_MS = 30_000;

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
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
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

export async function sendMessage(
  messages: ChatMessage[],
  systemPrompt: string,
  tools?: ToolDefinition[]
): Promise<ChatReply> {
  const key = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!key) throw new Error('VITE_OPENROUTER_API_KEY manquante');

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);

  const payload: {
    model: string;
    messages: OpenRouterMessage[];
    tools?: { type: 'function'; function: ToolDefinition }[];
  } = {
    model: MODEL,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
  };

  if (tools && tools.length > 0) {
    payload.tools = tools.map((t) => ({ type: 'function', function: t }));
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'DeVault',
      },
      body: JSON.stringify(payload),
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
      id: tc.id,
      name: tc.function.name,
      arguments: parseArgs(tc.function.arguments),
    }));

    if (!content && toolCalls.length === 0) {
      throw new Error('Réponse vide.');
    }
    return { content, toolCalls };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Timeout (30s). Réessaie.');
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}

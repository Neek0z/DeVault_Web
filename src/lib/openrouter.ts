const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-haiku-4-5';
const TIMEOUT_MS = 30_000;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(import.meta.env.VITE_OPENROUTER_API_KEY);
}

export async function sendMessage(
  messages: ChatMessage[],
  systemPrompt: string
): Promise<string> {
  const key = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!key) throw new Error('VITE_OPENROUTER_API_KEY manquante');

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);

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
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('Réponse vide.');
    return content;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Timeout (30s). Réessaie.');
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}

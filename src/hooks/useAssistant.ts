import { useCallback, useState } from 'react';
import { sendMessage, type ChatMessage } from '../lib/openrouter';
import type { JournalEntry, Project } from '../lib/types';

export interface ProjectContext {
  project: Project;
  recentEntries: JournalEntry[];
}

function buildSystemPrompt(ctx?: ProjectContext): string {
  const base = [
    "Tu es l'assistant de DeVault, une app de gestion de projets pour développeurs indie.",
    'Tu réponds en français, de manière concise et directe.',
  ];

  if (ctx) {
    const { project, recentEntries } = ctx;
    const stack = project.stack.length > 0 ? project.stack.join(', ') : 'non renseignée';
    const entries =
      recentEntries.length > 0
        ? recentEntries
            .map((e) => {
              const title = e.title?.trim() || e.body.trim().slice(0, 80);
              return `- [${e.type}] ${title}`;
            })
            .join('\n')
        : 'aucune';

    base.push(
      `Projet : ${project.name}, statut ${project.status}, stack : ${stack}.`,
      `Dernières entrées :\n${entries}`
    );
  }

  return base.join('\n');
}

export function useAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendUserMessage = useCallback(
    async (text: string, projectContext?: ProjectContext) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMessage: ChatMessage = { role: 'user', content: trimmed };
      const next = [...messages, userMessage];
      setMessages(next);
      setLoading(true);
      setError(null);

      try {
        const reply = await sendMessage(next, buildSystemPrompt(projectContext));
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading]
  );

  const clearConversation = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, loading, error, sendUserMessage, clearConversation };
}

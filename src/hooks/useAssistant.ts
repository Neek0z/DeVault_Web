import { useCallback, useState } from 'react';
import { sendMessage, type ChatMessage } from '../lib/openrouter';
import { supabase } from '../lib/supabase';
import type { Credential, JournalEntry, Project } from '../lib/types';

export interface ProjectContext {
  project: Project;
  recentEntries: JournalEntry[];
}

interface UserData {
  projects: Project[];
  currentProject?: {
    project: Project;
    recentEntries: JournalEntry[];
    credentials: Credential[];
  };
}

async function loadUserData(projectId?: string): Promise<UserData> {
  const projectsRes = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });
  const projects = (projectsRes.data ?? []) as Project[];

  if (!projectId) return { projects };

  const [entriesRes, credentialsRes] = await Promise.all([
    supabase
      .from('journal_entries')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('credentials').select('*').eq('project_id', projectId),
  ]);

  const project = projects.find((p) => p.id === projectId);
  if (!project) return { projects };

  return {
    projects,
    currentProject: {
      project,
      recentEntries: (entriesRes.data ?? []) as JournalEntry[],
      credentials: (credentialsRes.data ?? []) as Credential[],
    },
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function buildSystemPrompt(data: UserData): string {
  const sections: string[] = [
    "Tu es l'assistant de DeVault, une app de gestion de projets pour développeurs indie.",
    'Tu réponds en français, de manière concise et directe.',
    "Tu as accès aux données réelles de l'utilisateur ci-dessous.",
  ];

  if (data.projects.length === 0) {
    sections.push("\nProjets de l'utilisateur : aucun pour l'instant.");
  } else {
    const list = data.projects
      .map((p) => {
        const stack = p.stack.length > 0 ? p.stack.join(', ') : '—';
        const desc = p.description?.trim() || '—';
        return `- ${p.name} (${p.status}) · stack : ${stack} · ${desc}`;
      })
      .join('\n');
    sections.push(`\nProjets de l'utilisateur :\n${list}`);
  }

  if (data.currentProject) {
    const { project, recentEntries, credentials } = data.currentProject;
    const stack = project.stack.length > 0 ? project.stack.join(', ') : '—';

    const entries =
      recentEntries.length > 0
        ? recentEntries
            .map((e) => {
              const title = e.title?.trim() || e.body.trim().slice(0, 80);
              const body = e.body.trim().slice(0, 300);
              return `- [${e.type}] ${formatDate(e.created_at)} — ${title}\n  ${body}`;
            })
            .join('\n')
        : 'aucune';

    const creds =
      credentials.length > 0
        ? credentials
            .map((c) => {
              const parts = [c.service];
              if (c.login) parts.push(`login: ${c.login}`);
              if (c.notes) parts.push(`notes: ${c.notes.slice(0, 200)}`);
              return `- ${parts.join(' · ')}`;
            })
            .join('\n')
        : 'aucun';

    sections.push(
      `\nProjet actuellement ouvert : ${project.name}`,
      `Stack : ${stack}`,
      `Statut : ${project.status}`,
      `Dernières entrées journal :\n${entries}`,
      `Identifiants :\n${creds}`
    );
  }

  return sections.join('\n');
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
        const data = await loadUserData(projectContext?.project.id);
        const reply = await sendMessage(next, buildSystemPrompt(data));
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

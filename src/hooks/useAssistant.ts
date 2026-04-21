import { useCallback, useState } from 'react';
import {
  sendMessage,
  type ChatMessage,
  type ToolCall,
  type ToolDefinition,
} from '../lib/openrouter';
import { logActivity, truncate } from '../lib/activity';
import { supabase } from '../lib/supabase';
import type {
  Credential,
  JournalEntry,
  JournalType,
  Project,
  ProjectStatus,
} from '../lib/types';

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
    "Tu peux aussi agir sur les données via les fonctions disponibles. Quand l'utilisateur dicte une idée ou une note de manière informelle ou orale, reformule-la de façon claire et concise avant de l'enregistrer. Détecte automatiquement le projet concerné depuis le contexte ou ce que dit l'utilisateur. Si tu n'es pas sûr du projet, demande confirmation avant d'agir.",
  ];

  if (data.projects.length === 0) {
    sections.push("\nProjets de l'utilisateur : aucun pour l'instant.");
  } else {
    const list = data.projects
      .map((p) => {
        const stack = p.stack.length > 0 ? p.stack.join(', ') : '—';
        const desc = p.description?.trim() || '—';
        return `- ${p.name} (id: ${p.id}, ${p.status}) · stack : ${stack} · ${desc}`;
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
      `\nProjet actuellement ouvert : ${project.name} (id: ${project.id})`,
      `Stack : ${stack}`,
      `Statut : ${project.status}`,
      `Dernières entrées journal :\n${entries}`,
      `Identifiants :\n${creds}`
    );
  }

  return sections.join('\n');
}

const TOOLS: ToolDefinition[] = [
  {
    name: 'add_journal_entry',
    description:
      "Ajoute une entrée dans le journal d'un projet (note, idée, bug, ou décision).",
    parameters: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'ID du projet concerné.' },
        type: {
          type: 'string',
          enum: ['note', 'idea', 'bug', 'decision'],
          description: "Type de l'entrée.",
        },
        title: { type: 'string', description: 'Titre court (optionnel).' },
        body: { type: 'string', description: "Contenu reformulé clairement." },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags optionnels.',
        },
      },
      required: ['project_id', 'type', 'body'],
    },
  },
  {
    name: 'add_todo',
    description: "Ajoute une tâche à faire dans un projet.",
    parameters: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'ID du projet concerné.' },
        text: { type: 'string', description: 'Description concise de la tâche.' },
      },
      required: ['project_id', 'text'],
    },
  },
  {
    name: 'add_idea',
    description:
      "Ajoute une idée globale (non rattachée à un projet) dans la liste d'idées en vrac.",
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titre court (optionnel).' },
        body: { type: 'string', description: "Contenu reformulé clairement." },
        category: {
          type: 'string',
          description: 'Catégorie (optionnel) : App mobile, Outil interne, Feature, Side project.',
        },
      },
      required: ['body'],
    },
  },
  {
    name: 'update_project_status',
    description: "Change le statut d'un projet.",
    parameters: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'ID du projet.' },
        status: {
          type: 'string',
          enum: ['active', 'paused', 'abandoned', 'idea'],
          description: 'Nouveau statut.',
        },
      },
      required: ['project_id', 'status'],
    },
  },
  {
    name: 'update_journal_entry',
    description: "Met à jour une entrée de journal existante.",
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: "ID de l'entrée." },
        title: { type: 'string' },
        body: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['id'],
    },
  },
];

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null;
}

function asStringArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const out = v.filter((x): x is string => typeof x === 'string');
  return out;
}

async function executeTool(
  call: ToolCall,
  projects: Project[]
): Promise<string> {
  const args = call.arguments;

  if (call.name === 'add_journal_entry') {
    const project_id = asString(args.project_id);
    const type = asString(args.type) as JournalType | null;
    const body = asString(args.body);
    if (!project_id || !type || !body) return '⚠ Arguments manquants pour ajouter une entrée.';
    const project = projects.find((p) => p.id === project_id);
    const entryTitle = asString(args.title);
    const { data, error } = await supabase
      .from('journal_entries')
      .insert({
        project_id,
        type,
        title: entryTitle,
        body,
        tags: asStringArray(args.tags) ?? [],
      })
      .select('id')
      .single();
    if (error) return `⚠ Erreur : ${error.message}`;
    const label = project ? project.name : 'ce projet';
    const typeLabel =
      type === 'idea' ? 'Idée' : type === 'bug' ? 'Bug' : type === 'decision' ? 'Décision' : 'Note';
    logActivity({
      resource_type: 'journal',
      resource_id: (data as { id: string } | null)?.id ?? null,
      project_id,
      action: 'create',
      label: `Journal (${type}) via IA — ${truncate(entryTitle ?? body)}`,
    });
    return `✓ ${typeLabel} ajoutée dans ${label}.`;
  }

  if (call.name === 'add_todo') {
    const project_id = asString(args.project_id);
    const text = asString(args.text);
    if (!project_id || !text) return '⚠ Arguments manquants pour ajouter une tâche.';
    const project = projects.find((p) => p.id === project_id);
    const { data, error } = await supabase
      .from('todos')
      .insert({ project_id, text })
      .select('id')
      .single();
    if (error) return `⚠ Erreur : ${error.message}`;
    const label = project ? project.name : 'ce projet';
    logActivity({
      resource_type: 'todo',
      resource_id: (data as { id: string } | null)?.id ?? null,
      project_id,
      action: 'create',
      label: `Tâche ajoutée via IA — ${truncate(text)}`,
    });
    return `✓ Tâche ajoutée dans ${label}.`;
  }

  if (call.name === 'add_idea') {
    const body = asString(args.body);
    if (!body) return '⚠ Corps manquant pour ajouter une idée.';
    const { data: userRes } = await supabase.auth.getUser();
    const user_id = userRes.user?.id;
    if (!user_id) return "⚠ Utilisateur non connecté.";
    const ideaTitle = asString(args.title);
    const { data, error } = await supabase
      .from('ideas')
      .insert({
        user_id,
        title: ideaTitle,
        body,
        category: asString(args.category),
      })
      .select('id')
      .single();
    if (error) return `⚠ Erreur : ${error.message}`;
    logActivity({
      resource_type: 'idea',
      resource_id: (data as { id: string } | null)?.id ?? null,
      action: 'create',
      label: `Idée ajoutée via IA — ${truncate(ideaTitle ?? body)}`,
    });
    return '✓ Idée ajoutée dans la liste.';
  }

  if (call.name === 'update_project_status') {
    const project_id = asString(args.project_id);
    const status = asString(args.status) as ProjectStatus | null;
    if (!project_id || !status) return '⚠ Arguments manquants.';
    const project = projects.find((p) => p.id === project_id);
    const { error } = await supabase
      .from('projects')
      .update({ status })
      .eq('id', project_id);
    if (error) return `⚠ Erreur : ${error.message}`;
    const label = project ? project.name : 'projet';
    logActivity({
      resource_type: 'project',
      resource_id: project_id,
      project_id,
      action: 'update',
      label: `Statut → ${status} via IA — ${truncate(label)}`,
    });
    return `✓ Statut de ${label} → ${status}.`;
  }

  if (call.name === 'update_journal_entry') {
    const id = asString(args.id);
    if (!id) return '⚠ ID manquant.';
    const patch: Record<string, unknown> = {};
    if ('title' in args) patch.title = asString(args.title);
    if ('body' in args) {
      const body = asString(args.body);
      if (body) patch.body = body;
    }
    if ('tags' in args) {
      const tags = asStringArray(args.tags);
      if (tags) patch.tags = tags;
    }
    if (Object.keys(patch).length === 0) return '⚠ Rien à mettre à jour.';
    const { data, error } = await supabase
      .from('journal_entries')
      .update(patch)
      .eq('id', id)
      .select('project_id, title, body')
      .single();
    if (error) return `⚠ Erreur : ${error.message}`;
    const updated = data as { project_id: string; title: string | null; body: string } | null;
    logActivity({
      resource_type: 'journal',
      resource_id: id,
      project_id: updated?.project_id ?? null,
      action: 'update',
      label: `Journal modifié via IA — ${truncate(updated?.title ?? updated?.body ?? '')}`,
    });
    return '✓ Entrée mise à jour.';
  }

  return `⚠ Fonction inconnue : ${call.name}`;
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
        const reply = await sendMessage(next, buildSystemPrompt(data), TOOLS);

        const newMessages: ChatMessage[] = [];
        if (reply.content) {
          newMessages.push({ role: 'assistant', content: reply.content });
        }
        for (const call of reply.toolCalls) {
          const result = await executeTool(call, data.projects);
          newMessages.push({ role: 'assistant', content: result });
        }
        if (newMessages.length === 0) {
          newMessages.push({ role: 'assistant', content: '…' });
        }
        setMessages((prev) => [...prev, ...newMessages]);
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

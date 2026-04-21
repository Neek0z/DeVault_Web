import { useCallback, useEffect, useState } from 'react';
import { logActivity, truncate } from '../lib/activity';
import { supabase } from '../lib/supabase';
import type { Idea, Project } from '../lib/types';

function ideaLabel(idea: Idea): string {
  return idea.title?.trim() || truncate(idea.body);
}

export interface IdeaInput {
  title?: string | null;
  body: string;
  category?: string | null;
}

interface State {
  ideas: Idea[];
  loading: boolean;
  error: string | null;
}

async function fetchIdeas(): Promise<{ ideas: Idea[]; error: string | null }> {
  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return { ideas: [], error: error.message };
  return { ideas: (data ?? []) as Idea[], error: null };
}

export function useIdeas() {
  const [state, setState] = useState<State>({
    ideas: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { ideas, error } = await fetchIdeas();
      if (cancelled) return;
      setState({ ideas, loading: false, error });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refetch = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { ideas, error } = await fetchIdeas();
    setState({ ideas, loading: false, error });
  }, []);

  const insertIdea = useCallback(async (input: IdeaInput): Promise<Idea | null> => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) throw new Error('Non authentifié');

    const payload = {
      user_id: user.id,
      title: input.title ?? null,
      body: input.body,
      category: input.category ?? null,
    };
    const { data, error } = await supabase
      .from('ideas')
      .insert(payload)
      .select()
      .single();

    if (error) {
      setState((s) => ({ ...s, error: error.message }));
      return null;
    }
    const idea = data as Idea;
    setState((s) => ({ ...s, ideas: [idea, ...s.ideas] }));
    logActivity({
      resource_type: 'idea',
      resource_id: idea.id,
      action: 'create',
      label: `Idée ajoutée — ${ideaLabel(idea)}`,
    });
    return idea;
  }, []);

  const updateIdea = useCallback(
    async (id: string, patch: IdeaInput): Promise<Idea | null> => {
      const payload: Record<string, unknown> = {};
      if ('title' in patch) payload.title = patch.title ?? null;
      if ('body' in patch) payload.body = patch.body;
      if ('category' in patch) payload.category = patch.category ?? null;

      const { data, error } = await supabase
        .from('ideas')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        setState((s) => ({ ...s, error: error.message }));
        return null;
      }
      const idea = data as Idea;
      setState((s) => ({
        ...s,
        ideas: s.ideas.map((i) => (i.id === id ? idea : i)),
      }));
      logActivity({
        resource_type: 'idea',
        resource_id: idea.id,
        action: 'update',
        label: `Idée modifiée — ${ideaLabel(idea)}`,
      });
      return idea;
    },
    []
  );

  const deleteIdea = useCallback(
    async (id: string): Promise<boolean> => {
      const target = state.ideas.find((i) => i.id === id);
      const { error } = await supabase.from('ideas').delete().eq('id', id);
      if (error) {
        setState((s) => ({ ...s, error: error.message }));
        return false;
      }
      setState((s) => ({ ...s, ideas: s.ideas.filter((i) => i.id !== id) }));
      if (target) {
        logActivity({
          resource_type: 'idea',
          resource_id: null,
          action: 'delete',
          label: `Idée supprimée — ${ideaLabel(target)}`,
        });
      }
      return true;
    },
    [state.ideas]
  );

  const promoteToProject = useCallback(
    async (idea: Idea): Promise<Project | null> => {
      if (idea.promoted_to_project_id) return null;
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error('Non authentifié');

      const projectPayload = {
        user_id: user.id,
        name: idea.title?.trim() || idea.body.trim().slice(0, 60),
        description: idea.body,
        status: 'idea' as const,
        stack: [],
      };

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert(projectPayload)
        .select()
        .single();

      if (projectError || !project) {
        setState((s) => ({
          ...s,
          error: projectError?.message ?? 'Création du projet impossible',
        }));
        return null;
      }

      const typedProject = project as Project;

      const { error: updateError } = await supabase
        .from('ideas')
        .update({ promoted_to_project_id: typedProject.id })
        .eq('id', idea.id);

      if (updateError) {
        setState((s) => ({ ...s, error: updateError.message }));
        return typedProject;
      }

      setState((s) => ({
        ...s,
        ideas: s.ideas.map((i) =>
          i.id === idea.id ? { ...i, promoted_to_project_id: typedProject.id } : i
        ),
      }));
      logActivity({
        resource_type: 'idea',
        resource_id: idea.id,
        project_id: typedProject.id,
        action: 'promote',
        label: `Idée promue en projet — ${truncate(typedProject.name)}`,
      });
      return typedProject;
    },
    []
  );

  return { ...state, refetch, insertIdea, updateIdea, deleteIdea, promoteToProject };
}

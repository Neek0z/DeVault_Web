import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Idea, Project } from '../lib/types';

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
    return idea;
  }, []);

  const deleteIdea = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('ideas').delete().eq('id', id);
    if (error) {
      setState((s) => ({ ...s, error: error.message }));
      return false;
    }
    setState((s) => ({ ...s, ideas: s.ideas.filter((i) => i.id !== id) }));
    return true;
  }, []);

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
      return typedProject;
    },
    []
  );

  return { ...state, refetch, insertIdea, deleteIdea, promoteToProject };
}

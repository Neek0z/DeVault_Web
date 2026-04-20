import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Project, ProjectStatus } from '../lib/types';

export interface ProjectInput {
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  stack?: string[];
}

interface State {
  projects: Project[];
  loading: boolean;
  error: string | null;
}

async function fetchProjects(): Promise<{ projects: Project[]; error: string | null }> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) return { projects: [], error: error.message };
  return { projects: (data ?? []) as Project[], error: null };
}

export function useProjects() {
  const [state, setState] = useState<State>({
    projects: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { projects, error } = await fetchProjects();
      if (cancelled) return;
      setState({ projects, loading: false, error });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refetch = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { projects, error } = await fetchProjects();
    setState({ projects, loading: false, error });
  }, []);

  const insertProject = useCallback(
    async (input: ProjectInput): Promise<Project | null> => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error('Non authentifié');

      const payload = {
        user_id: user.id,
        name: input.name,
        description: input.description ?? null,
        status: input.status ?? 'idea',
        stack: input.stack ?? [],
      };

      const { data, error } = await supabase
        .from('projects')
        .insert(payload)
        .select()
        .single();

      if (error) {
        setState((s) => ({ ...s, error: error.message }));
        return null;
      }

      const project = data as Project;
      setState((s) => ({ ...s, projects: [project, ...s.projects] }));
      return project;
    },
    []
  );

  const updateProject = useCallback(
    async (id: string, input: Partial<ProjectInput>): Promise<Project | null> => {
      const payload: Record<string, unknown> = { ...input, updated_at: new Date().toISOString() };

      const { data, error } = await supabase
        .from('projects')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        setState((s) => ({ ...s, error: error.message }));
        return null;
      }

      const project = data as Project;
      setState((s) => ({
        ...s,
        projects: s.projects
          .map((p) => (p.id === id ? project : p))
          .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
      }));
      return project;
    },
    []
  );

  return { ...state, refetch, insertProject, updateProject };
}

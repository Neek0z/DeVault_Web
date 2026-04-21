import { useCallback, useEffect, useState } from 'react';
import { logActivity, truncate } from '../lib/activity';
import { supabase } from '../lib/supabase';
import type { JournalEntry, Project, ProjectStatus } from '../lib/types';

interface State {
  project: Project | null;
  recentEntries: JournalEntry[];
  loading: boolean;
  error: string | null;
}

export interface ProjectUpdate {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  stack?: string[];
}

interface FetchResult {
  project: Project | null;
  recentEntries: JournalEntry[];
  error: string | null;
}

async function fetchProject(id: string): Promise<FetchResult> {
  const [projectRes, entriesRes] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase
      .from('journal_entries')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  if (projectRes.error) {
    return { project: null, recentEntries: [], error: projectRes.error.message };
  }

  return {
    project: projectRes.data as Project,
    recentEntries: (entriesRes.data ?? []) as JournalEntry[],
    error: null,
  };
}

export function useProject(id: string | undefined) {
  const [state, setState] = useState<State>({
    project: null,
    recentEntries: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await null;
      if (cancelled) return;
      if (!id) {
        setState({ project: null, recentEntries: [], loading: false, error: null });
        return;
      }
      const result = await fetchProject(id);
      if (cancelled) return;
      setState({ ...result, loading: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const refetch = useCallback(async () => {
    if (!id) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    const result = await fetchProject(id);
    setState({ ...result, loading: false });
  }, [id]);

  const save = useCallback(
    async (patch: ProjectUpdate): Promise<Project | null> => {
      if (!id) return null;
      const payload: Record<string, unknown> = {
        ...patch,
        updated_at: new Date().toISOString(),
      };
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
      setState((s) => ({ ...s, project }));
      const fields = Object.keys(patch);
      const label =
        fields.length === 1 && fields[0] === 'status'
          ? `Statut → ${project.status} — ${truncate(project.name)}`
          : `Projet modifié — ${truncate(project.name)}`;
      logActivity({
        resource_type: 'project',
        resource_id: project.id,
        project_id: project.id,
        action: 'update',
        label,
      });
      return project;
    },
    [id]
  );

  return { ...state, refetch, save };
}

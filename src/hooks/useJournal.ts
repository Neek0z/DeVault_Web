import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { JournalEntry, JournalType } from '../lib/types';

export interface JournalInput {
  project_id: string;
  type: JournalType;
  title?: string | null;
  body: string;
  tags?: string[];
}

interface State {
  entries: JournalEntry[];
  loading: boolean;
  error: string | null;
}

async function fetchEntries(
  projectId: string
): Promise<{ entries: JournalEntry[]; error: string | null }> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) return { entries: [], error: error.message };
  return { entries: (data ?? []) as JournalEntry[], error: null };
}

export function useJournal(projectId: string | undefined) {
  const [state, setState] = useState<State>({
    entries: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await null;
      if (cancelled) return;
      if (!projectId) {
        setState({ entries: [], loading: false, error: null });
        return;
      }
      const { entries, error } = await fetchEntries(projectId);
      if (cancelled) return;
      setState({ entries, loading: false, error });
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const refetch = useCallback(async () => {
    if (!projectId) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    const { entries, error } = await fetchEntries(projectId);
    setState({ entries, loading: false, error });
  }, [projectId]);

  const insertEntry = useCallback(
    async (input: JournalInput): Promise<JournalEntry | null> => {
      const payload = {
        project_id: input.project_id,
        type: input.type,
        title: input.title ?? null,
        body: input.body,
        tags: input.tags ?? [],
      };
      const { data, error } = await supabase
        .from('journal_entries')
        .insert(payload)
        .select()
        .single();

      if (error) {
        setState((s) => ({ ...s, error: error.message }));
        return null;
      }
      const entry = data as JournalEntry;
      setState((s) => ({ ...s, entries: [entry, ...s.entries] }));
      return entry;
    },
    []
  );

  const updateEntry = useCallback(
    async (
      id: string,
      patch: { title?: string | null; body?: string; tags?: string[] }
    ): Promise<JournalEntry | null> => {
      const { data, error } = await supabase
        .from('journal_entries')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        setState((s) => ({ ...s, error: error.message }));
        return null;
      }
      const entry = data as JournalEntry;
      setState((s) => ({
        ...s,
        entries: s.entries.map((e) => (e.id === id ? entry : e)),
      }));
      return entry;
    },
    []
  );

  const deleteEntry = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('journal_entries').delete().eq('id', id);
    if (error) {
      setState((s) => ({ ...s, error: error.message }));
      return false;
    }
    setState((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) }));
    return true;
  }, []);

  return { ...state, refetch, insertEntry, updateEntry, deleteEntry };
}

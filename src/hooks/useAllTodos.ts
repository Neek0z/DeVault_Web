import { useCallback, useEffect, useState } from 'react';
import { logActivity, truncate } from '../lib/activity';
import { supabase } from '../lib/supabase';
import type { ProjectStatus, Todo } from '../lib/types';
import { useRealtimeSync } from './useRealtimeSync';

export interface TodoWithProject extends Todo {
  project: { id: string; name: string; status: ProjectStatus } | null;
}

interface State {
  todos: TodoWithProject[];
  loading: boolean;
  error: string | null;
}

async function fetchAll(): Promise<{ todos: TodoWithProject[]; error: string | null }> {
  const { data, error } = await supabase
    .from('todos')
    .select('*, project:projects(id, name, status)')
    .order('completed', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) return { todos: [], error: error.message };
  return { todos: (data ?? []) as TodoWithProject[], error: null };
}

export function useAllTodos() {
  const [state, setState] = useState<State>({ todos: [], loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetchAll();
      if (cancelled) return;
      setState({ todos: res.todos, loading: false, error: res.error });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refetch = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const res = await fetchAll();
    setState({ todos: res.todos, loading: false, error: res.error });
  }, []);

  // Realtime: on any change, refetch (so the join with project is kept up to date).
  const onRealtime = useCallback(() => {
    void refetch();
  }, [refetch]);

  useRealtimeSync<Todo>({ table: 'todos', onChange: onRealtime });

  const insert = useCallback(
    async (text: string, projectId: string): Promise<boolean> => {
      const trimmed = text.trim();
      if (!trimmed || !projectId) return false;
      const { data, error } = await supabase
        .from('todos')
        .insert({ project_id: projectId, text: trimmed })
        .select('*, project:projects(id, name, status)')
        .single();
      if (error) {
        setState((s) => ({ ...s, error: error.message }));
        return false;
      }
      const created = data as TodoWithProject;
      setState((s) => ({ ...s, todos: [created, ...s.todos] }));
      logActivity({
        resource_type: 'todo',
        resource_id: created.id,
        project_id: created.project_id,
        action: 'create',
        label: `Tâche ajoutée — ${truncate(created.text)}`,
      });
      return true;
    },
    []
  );

  const toggle = useCallback(
    async (id: string, completed: boolean): Promise<boolean> => {
      let target: TodoWithProject | undefined;
      setState((s) => {
        target = s.todos.find((t) => t.id === id);
        return {
          ...s,
          todos: s.todos.map((t) => (t.id === id ? { ...t, completed } : t)),
        };
      });
      const { error } = await supabase
        .from('todos')
        .update({ completed })
        .eq('id', id);
      if (error) {
        setState((s) => ({
          ...s,
          error: error.message,
          todos: s.todos.map((t) => (t.id === id ? { ...t, completed: !completed } : t)),
        }));
        return false;
      }
      if (target) {
        logActivity({
          resource_type: 'todo',
          resource_id: id,
          project_id: target.project_id,
          action: 'toggle',
          label: `Tâche ${completed ? 'cochée' : 'décochée'} — ${truncate(target.text)}`,
        });
      }
      return true;
    },
    []
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      const target = state.todos.find((t) => t.id === id);
      const { error } = await supabase.from('todos').delete().eq('id', id);
      if (error) {
        setState((s) => ({ ...s, error: error.message }));
        return false;
      }
      setState((s) => ({ ...s, todos: s.todos.filter((t) => t.id !== id) }));
      if (target) {
        logActivity({
          resource_type: 'todo',
          resource_id: null,
          project_id: target.project_id,
          action: 'delete',
          label: `Tâche supprimée — ${truncate(target.text)}`,
        });
      }
      return true;
    },
    [state.todos]
  );

  return { ...state, refetch, insert, toggle, remove };
}

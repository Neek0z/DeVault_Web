import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Todo } from '../lib/types';

interface State {
  todos: Todo[];
  loading: boolean;
  error: string | null;
}

async function fetchTodos(
  projectId: string
): Promise<{ todos: Todo[]; error: string | null }> {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('project_id', projectId)
    .order('completed', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) return { todos: [], error: error.message };
  return { todos: (data ?? []) as Todo[], error: null };
}

export function useTodos(projectId: string | undefined) {
  const [state, setState] = useState<State>({
    todos: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await null;
      if (cancelled) return;
      if (!projectId) {
        setState({ todos: [], loading: false, error: null });
        return;
      }
      const { todos, error } = await fetchTodos(projectId);
      if (cancelled) return;
      setState({ todos, loading: false, error });
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const insertTodo = useCallback(
    async (text: string): Promise<Todo | null> => {
      if (!projectId) return null;
      const trimmed = text.trim();
      if (!trimmed) return null;
      const { data, error } = await supabase
        .from('todos')
        .insert({ project_id: projectId, text: trimmed })
        .select()
        .single();
      if (error) {
        setState((s) => ({ ...s, error: error.message }));
        return null;
      }
      const todo = data as Todo;
      setState((s) => ({ ...s, todos: [todo, ...s.todos] }));
      return todo;
    },
    [projectId]
  );

  const toggleTodo = useCallback(
    async (id: string, completed: boolean): Promise<boolean> => {
      setState((s) => ({
        ...s,
        todos: s.todos.map((t) => (t.id === id ? { ...t, completed } : t)),
      }));
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
      return true;
    },
    []
  );

  const deleteTodo = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('todos').delete().eq('id', id);
    if (error) {
      setState((s) => ({ ...s, error: error.message }));
      return false;
    }
    setState((s) => ({ ...s, todos: s.todos.filter((t) => t.id !== id) }));
    return true;
  }, []);

  return { ...state, insertTodo, toggleTodo, deleteTodo };
}

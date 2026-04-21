import { useCallback, useEffect, useState } from 'react';
import { logActivity, truncate } from '../lib/activity';
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
      logActivity({
        resource_type: 'todo',
        resource_id: todo.id,
        project_id: todo.project_id,
        action: 'create',
        label: `Tâche ajoutée — ${truncate(todo.text)}`,
      });
      return todo;
    },
    [projectId]
  );

  const toggleTodo = useCallback(
    async (id: string, completed: boolean): Promise<boolean> => {
      let target: Todo | undefined;
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

  const updateTodo = useCallback(
    async (id: string, text: string): Promise<boolean> => {
      const trimmed = text.trim();
      if (!trimmed) return false;
      const { error } = await supabase
        .from('todos')
        .update({ text: trimmed })
        .eq('id', id);
      if (error) {
        setState((s) => ({ ...s, error: error.message }));
        return false;
      }
      let projectIdForLog: string | null = null;
      setState((s) => {
        projectIdForLog = s.todos.find((t) => t.id === id)?.project_id ?? null;
        return {
          ...s,
          todos: s.todos.map((t) => (t.id === id ? { ...t, text: trimmed } : t)),
        };
      });
      logActivity({
        resource_type: 'todo',
        resource_id: id,
        project_id: projectIdForLog,
        action: 'update',
        label: `Tâche modifiée — ${truncate(trimmed)}`,
      });
      return true;
    },
    []
  );

  const deleteTodo = useCallback(
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

  return { ...state, insertTodo, toggleTodo, updateTodo, deleteTodo };
}

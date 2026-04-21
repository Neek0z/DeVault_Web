import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { ActivityLog } from '../lib/types';

interface State {
  items: ActivityLog[];
  loading: boolean;
  error: string | null;
}

const PAGE_SIZE = 100;

async function fetchLog(): Promise<{ items: ActivityLog[]; error: string | null }> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (error) return { items: [], error: error.message };
  return { items: (data ?? []) as ActivityLog[], error: null };
}

export function useActivityLog() {
  const [state, setState] = useState<State>({ items: [], loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { items, error } = await fetchLog();
      if (cancelled) return;
      setState({ items, loading: false, error });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refetch = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { items, error } = await fetchLog();
    setState({ items, loading: false, error });
  }, []);

  const clear = useCallback(async (): Promise<boolean> => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return false;
    const { error } = await supabase
      .from('activity_log')
      .delete()
      .eq('user_id', user.id);
    if (error) {
      setState((s) => ({ ...s, error: error.message }));
      return false;
    }
    setState({ items: [], loading: false, error: null });
    return true;
  }, []);

  return { ...state, refetch, clear };
}

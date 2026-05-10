import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

type Event = 'INSERT' | 'UPDATE' | 'DELETE';

interface Options<T extends { id: string }> {
  /** Postgres table name. */
  table: string;
  /** Optional filter, e.g. `"project_id=eq.<uuid>"`. */
  filter?: string | null;
  /** Disable subscription entirely (e.g. while parameters are not ready). */
  enabled?: boolean;
  /** Apply a remote change to local state. */
  onChange: (event: Event, row: T, old: T | null) => void;
}

/**
 * Subscribe to Supabase realtime changes on a table and forward them.
 *
 * Requires replication enabled for the table in Supabase
 * (Database → Replication → enable for the table).
 */
export function useRealtimeSync<T extends { id: string }>({
  table,
  filter,
  enabled = true,
  onChange,
}: Options<T>) {
  useEffect(() => {
    if (!enabled) return;
    // Unique name to avoid re-using an already-subscribed channel
    // (Supabase reuses by name; StrictMode double-mount would crash otherwise).
    const channelName = `rt:${table}:${filter ?? 'all'}:${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter ? { filter } : {}),
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const event = payload.eventType as Event;
          const row = (payload.new ?? payload.old) as T;
          const old = (payload.old ?? null) as T | null;
          if (row) onChange(event, row, old);
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, filter, enabled, onChange]);
}

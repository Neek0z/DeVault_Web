import { useCallback, useEffect, useState } from 'react';
import { logActivity, truncate } from '../lib/activity';
import { supabase } from '../lib/supabase';
import type { Credential } from '../lib/types';

export interface CredentialInput {
  project_id: string;
  service: string;
  login?: string | null;
  url?: string | null;
  notes?: string | null;
}

interface State {
  credentials: Credential[];
  loading: boolean;
  error: string | null;
}

async function fetchCredentials(
  projectId: string
): Promise<{ credentials: Credential[]; error: string | null }> {
  const { data, error } = await supabase
    .from('credentials')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) return { credentials: [], error: error.message };
  return { credentials: (data ?? []) as Credential[], error: null };
}

export function useCredentials(projectId: string | undefined) {
  const [state, setState] = useState<State>({
    credentials: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await null;
      if (cancelled) return;
      if (!projectId) {
        setState({ credentials: [], loading: false, error: null });
        return;
      }
      const { credentials, error } = await fetchCredentials(projectId);
      if (cancelled) return;
      setState({ credentials, loading: false, error });
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const refetch = useCallback(async () => {
    if (!projectId) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    const { credentials, error } = await fetchCredentials(projectId);
    setState({ credentials, loading: false, error });
  }, [projectId]);

  const insertCredential = useCallback(
    async (input: CredentialInput): Promise<Credential | null> => {
      const payload = {
        project_id: input.project_id,
        service: input.service,
        login: input.login ?? null,
        url: input.url ?? null,
        notes: input.notes ?? null,
      };
      const { data, error } = await supabase
        .from('credentials')
        .insert(payload)
        .select()
        .single();

      if (error) {
        setState((s) => ({ ...s, error: error.message }));
        return null;
      }
      const cred = data as Credential;
      setState((s) => ({ ...s, credentials: [cred, ...s.credentials] }));
      logActivity({
        resource_type: 'credential',
        resource_id: cred.id,
        project_id: cred.project_id,
        action: 'create',
        label: `Identifiant ajouté — ${truncate(cred.service)}`,
      });
      return cred;
    },
    []
  );

  const updateCredential = useCallback(
    async (
      id: string,
      patch: Partial<Omit<CredentialInput, 'project_id'>>
    ): Promise<Credential | null> => {
      const { data, error } = await supabase
        .from('credentials')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        setState((s) => ({ ...s, error: error.message }));
        return null;
      }
      const cred = data as Credential;
      setState((s) => ({
        ...s,
        credentials: s.credentials.map((c) => (c.id === id ? cred : c)),
      }));
      logActivity({
        resource_type: 'credential',
        resource_id: cred.id,
        project_id: cred.project_id,
        action: 'update',
        label: `Identifiant modifié — ${truncate(cred.service)}`,
      });
      return cred;
    },
    []
  );

  const deleteCredential = useCallback(
    async (id: string): Promise<boolean> => {
      const target = state.credentials.find((c) => c.id === id);
      const { error } = await supabase.from('credentials').delete().eq('id', id);
      if (error) {
        setState((s) => ({ ...s, error: error.message }));
        return false;
      }
      setState((s) => ({ ...s, credentials: s.credentials.filter((c) => c.id !== id) }));
      if (target) {
        logActivity({
          resource_type: 'credential',
          resource_id: null,
          project_id: target.project_id,
          action: 'delete',
          label: `Identifiant supprimé — ${truncate(target.service)}`,
        });
      }
      return true;
    },
    [state.credentials]
  );

  return { ...state, refetch, insertCredential, updateCredential, deleteCredential };
}

import { supabase } from './supabase';
import type { ActivityAction, ActivityResource } from './types';

interface LogInput {
  resource_type: ActivityResource;
  resource_id?: string | null;
  project_id?: string | null;
  action: ActivityAction;
  label: string;
}

export function logActivity(input: LogInput): void {
  void (async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;
    await supabase.from('activity_log').insert({
      user_id: user.id,
      resource_type: input.resource_type,
      resource_id: input.resource_id ?? null,
      project_id: input.project_id ?? null,
      action: input.action,
      label: input.label,
    });
  })();
}

export function truncate(text: string, max = 60): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

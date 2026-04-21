import {
  ChevronLeft,
  CircleCheck,
  FileText,
  FolderKanban,
  KeyRound,
  Lightbulb,
  ListTodo,
  RefreshCcw,
  Trash2,
} from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useActivityLog } from '../hooks/useActivityLog';
import { relativeDate } from '../lib/date';
import type { ActivityLog, ActivityResource } from '../lib/types';
import styles from './History.module.css';

const RESOURCE_ICON: Record<ActivityResource, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  project: FolderKanban,
  journal: FileText,
  credential: KeyRound,
  idea: Lightbulb,
  todo: ListTodo,
};

function actionSymbol(action: ActivityLog['action']) {
  switch (action) {
    case 'create':
      return '＋';
    case 'update':
      return '✎';
    case 'delete':
      return '✕';
    case 'promote':
      return '↗';
    case 'toggle':
      return '✓';
  }
}

function groupByDay(items: ActivityLog[]): { key: string; label: string; items: ActivityLog[] }[] {
  const groups = new Map<string, { label: string; items: ActivityLog[] }>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  for (const item of items) {
    const d = new Date(item.created_at);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const key = dayStart.toISOString();
    let label: string;
    if (dayStart.getTime() === today.getTime()) label = "Aujourd'hui";
    else if (dayStart.getTime() === yesterday.getTime()) label = 'Hier';
    else
      label = d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    const group = groups.get(key);
    if (group) group.items.push(item);
    else groups.set(key, { label, items: [item] });
  }
  return Array.from(groups.entries()).map(([key, g]) => ({ key, ...g }));
}

export default function History() {
  const { items, loading, error, refetch, clear } = useActivityLog();

  const grouped = useMemo(() => groupByDay(items), [items]);

  async function handleClear() {
    const ok = window.confirm(
      "Effacer tout l'historique ? Cette action est définitive."
    );
    if (!ok) return;
    await clear();
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <Link to="/settings" className={styles.back}>
          <ChevronLeft size={18} strokeWidth={1.5} /> Paramètres
        </Link>
        <div className={styles.header}>
          <h1 className={styles.title}>Historique</h1>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => void refetch()}
              aria-label="Actualiser"
              disabled={loading}
            >
              <RefreshCcw size={16} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => void handleClear()}
              aria-label="Tout effacer"
              disabled={loading || items.length === 0}
            >
              <Trash2 size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {loading && <p className={styles.state}>Chargement…</p>}
        {error && <p className={styles.state}>Erreur : {error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className={styles.state}>
            Aucune activité pour le moment. Tes prochaines modifications apparaîtront ici.
          </p>
        )}

        {!loading &&
          !error &&
          grouped.map((group) => (
            <section key={group.key} className={styles.group}>
              <span className={styles.groupLabel}>{group.label}</span>
              <ul className={styles.list}>
                {group.items.map((item) => {
                  const Icon = RESOURCE_ICON[item.resource_type] ?? CircleCheck;
                  const target = item.project_id
                    ? `/projects/${item.project_id}`
                    : item.resource_type === 'idea'
                    ? '/ideas'
                    : null;
                  const Row = (
                    <>
                      <span className={styles.icon} aria-hidden>
                        <Icon size={16} strokeWidth={1.5} />
                      </span>
                      <div className={styles.text}>
                        <span className={styles.label}>{item.label}</span>
                        <span className={styles.meta}>
                          <span className={styles.action}>
                            {actionSymbol(item.action)}
                          </span>
                          <span>{relativeDate(item.created_at)}</span>
                        </span>
                      </div>
                    </>
                  );
                  return (
                    <li key={item.id} className={styles.item}>
                      {target ? (
                        <Link to={target} className={styles.row}>
                          {Row}
                        </Link>
                      ) : (
                        <div className={styles.row}>{Row}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
      </div>
    </div>
  );
}

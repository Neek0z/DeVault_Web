import {
  ArrowUpRight,
  CircleCheck,
  FileText,
  FolderKanban,
  KeyRound,
  Lightbulb,
  ListTodo,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useActivityLog } from '../hooks/useActivityLog';
import { useIdeas } from '../hooks/useIdeas';
import { useProjects } from '../hooks/useProjects';
import { relativeDate } from '../lib/date';
import { supabase } from '../lib/supabase';
import type { ActivityResource } from '../lib/types';
import styles from './DesktopHome.module.css';

const RESOURCE_ICON: Record<ActivityResource, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  project: FolderKanban,
  journal: FileText,
  credential: KeyRound,
  idea: Lightbulb,
  todo: ListTodo,
};

interface Counters {
  openTodos: number;
  weekJournal: number;
}

async function fetchCounters(): Promise<Counters> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [todosRes, journalRes] = await Promise.all([
    supabase
      .from('todos')
      .select('id', { count: 'exact', head: true })
      .eq('completed', false),
    supabase
      .from('journal_entries')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString()),
  ]);

  return {
    openTodos: todosRes.count ?? 0,
    weekJournal: journalRes.count ?? 0,
  };
}

export function DesktopHome() {
  const { projects } = useProjects();
  const { ideas } = useIdeas();
  const { items: activity } = useActivityLog();
  const [counters, setCounters] = useState<Counters>({ openTodos: 0, weekJournal: 0 });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const c = await fetchCounters();
      if (!cancelled) setCounters(c);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 6) return 'Bonne nuit';
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }, []);

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === 'active').slice(0, 6),
    [projects]
  );
  const activeCount = useMemo(
    () => projects.filter((p) => p.status === 'active').length,
    [projects]
  );

  const stats = [
    {
      label: 'Projets actifs',
      value: activeCount,
      total: projects.length,
      to: '/',
    },
    {
      label: 'Idées',
      value: ideas.length,
      to: '/ideas',
    },
    {
      label: 'Tâches ouvertes',
      value: counters.openTodos,
      to: null,
    },
    {
      label: 'Journal · 7j',
      value: counters.weekJournal,
      to: null,
    },
  ];

  const recentActivity = activity.slice(0, 10);

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <span className={styles.greeting}>{greeting}, Nicolas</span>
          <h1 className={styles.title}>Tableau de bord</h1>
          <p className={styles.subtitle}>
            {projects.length} projet{projects.length > 1 ? 's' : ''} · {activeCount} actif
            {activeCount > 1 ? 's' : ''}
          </p>
        </header>

        <section className={styles.statsGrid}>
          {stats.map((s) => {
            const inner = (
              <>
                <span className={styles.statLabel}>{s.label}</span>
                <span className={styles.statValue}>
                  {s.value}
                  {'total' in s && s.total !== undefined && (
                    <span className={styles.statTotal}> / {s.total}</span>
                  )}
                </span>
              </>
            );
            return s.to ? (
              <Link key={s.label} to={s.to} className={`${styles.stat} ${styles.statLink}`}>
                {inner}
                <ArrowUpRight size={14} strokeWidth={1.5} className={styles.statArrow} />
              </Link>
            ) : (
              <div key={s.label} className={styles.stat}>
                {inner}
              </div>
            );
          })}
        </section>

        <div className={styles.columns}>
          <section className={styles.column}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>Projets actifs</h2>
              {activeProjects.length > 0 && (
                <span className={styles.sectionCount}>{activeProjects.length}</span>
              )}
            </div>
            {activeProjects.length === 0 ? (
              <p className={styles.empty}>
                Aucun projet actif. Sélectionnes-en un dans le rail à gauche ou crée-en un.
              </p>
            ) : (
              <div className={styles.projectGrid}>
                {activeProjects.map((p) => (
                  <Link key={p.id} to={`/projects/${p.id}`} className={styles.projectCard}>
                    <span className={styles.projectName}>{p.name}</span>
                    {p.stack.length > 0 && (
                      <span className={styles.projectStack}>
                        {p.stack.slice(0, 4).join(' · ')}
                      </span>
                    )}
                    {p.description && (
                      <span className={styles.projectDesc}>{p.description}</span>
                    )}
                    <span className={styles.projectFoot}>
                      {relativeDate(p.updated_at)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className={styles.column}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>Activité récente</h2>
              <Link to="/history" className={styles.sectionLink}>
                Tout voir
              </Link>
            </div>
            {recentActivity.length === 0 ? (
              <p className={styles.empty}>Aucune activité pour le moment.</p>
            ) : (
              <ul className={styles.activityList}>
                {recentActivity.map((item) => {
                  const Icon = RESOURCE_ICON[item.resource_type] ?? CircleCheck;
                  const target = item.project_id
                    ? `/projects/${item.project_id}`
                    : item.resource_type === 'idea'
                    ? '/ideas'
                    : null;
                  const inner = (
                    <>
                      <span className={styles.activityIcon}>
                        <Icon size={14} strokeWidth={1.5} />
                      </span>
                      <span className={styles.activityLabel}>{item.label}</span>
                      <span className={styles.activityDate}>
                        {relativeDate(item.created_at)}
                      </span>
                    </>
                  );
                  return (
                    <li key={item.id}>
                      {target ? (
                        <Link to={target} className={styles.activityRow}>
                          {inner}
                        </Link>
                      ) : (
                        <div className={styles.activityRow}>{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

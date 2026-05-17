import { Check, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { FilterChip } from '../components/ui/FilterChip';
import { SkeletonList } from '../components/ui/Skeleton';
import { useAllTodos, type TodoWithProject } from '../hooks/useAllTodos';
import { useProjects } from '../hooks/useProjects';
import { relativeDate } from '../lib/date';
import styles from './Tasks.module.css';

const LAST_PROJECT_KEY = 'devault.tasks.lastProjectId';

type Filter = 'open' | 'done' | 'all';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'open', label: 'Ouvertes' },
  { value: 'done', label: 'Terminées' },
  { value: 'all', label: 'Toutes' },
];

interface Group {
  projectId: string | null;
  projectName: string;
  open: TodoWithProject[];
  done: TodoWithProject[];
}

function groupByProject(todos: TodoWithProject[]): Group[] {
  const map = new Map<string, Group>();
  for (const t of todos) {
    const key = t.project?.id ?? '__orphan__';
    let group = map.get(key);
    if (!group) {
      group = {
        projectId: t.project?.id ?? null,
        projectName: t.project?.name ?? 'Sans projet',
        open: [],
        done: [],
      };
      map.set(key, group);
    }
    if (t.completed) group.done.push(t);
    else group.open.push(t);
  }
  return Array.from(map.values()).sort((a, b) => {
    // Projects with open tasks first, then by open count desc, then alphabetically.
    if ((a.open.length > 0) !== (b.open.length > 0)) {
      return a.open.length > 0 ? -1 : 1;
    }
    if (a.open.length !== b.open.length) return b.open.length - a.open.length;
    return a.projectName.localeCompare(b.projectName, 'fr');
  });
}

export default function Tasks() {
  const { todos, loading, error, insert, toggle, remove } = useAllTodos();
  const { projects } = useProjects();
  const [filter, setFilter] = useState<Filter>('open');
  const [draft, setDraft] = useState('');
  const [projectId, setProjectId] = useState<string>(() => {
    try {
      return localStorage.getItem(LAST_PROJECT_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [submitting, setSubmitting] = useState(false);

  // Effective selection: fall back to first active project (or any project)
  // when the user hasn't picked one or when the stored choice is gone.
  const effectiveProjectId =
    projectId && projects.some((p) => p.id === projectId)
      ? projectId
      : (projects.find((p) => p.status === 'active') ?? projects[0])?.id ?? '';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !effectiveProjectId || submitting) return;
    setSubmitting(true);
    const ok = await insert(draft, effectiveProjectId);
    setSubmitting(false);
    if (ok) {
      setDraft('');
      try {
        localStorage.setItem(LAST_PROJECT_KEY, effectiveProjectId);
      } catch {
        /* ignore */
      }
    }
  }

  const visible = useMemo(() => {
    if (filter === 'all') return todos;
    if (filter === 'done') return todos.filter((t) => t.completed);
    return todos.filter((t) => !t.completed);
  }, [todos, filter]);

  const groups = useMemo(() => groupByProject(visible), [visible]);

  const totals = useMemo(
    () => ({
      open: todos.filter((t) => !t.completed).length,
      done: todos.filter((t) => t.completed).length,
    }),
    [todos]
  );

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <Link to="/" className={styles.back}>
          <ChevronLeft size={18} strokeWidth={1.5} /> Projets
        </Link>
        <div className={styles.header}>
          <div>
            <p className={styles.counter}>
              {totals.open} ouverte{totals.open > 1 ? 's' : ''} · {totals.done} terminée
              {totals.done > 1 ? 's' : ''}
            </p>
            <h1 className={styles.title}>Tâches</h1>
          </div>
        </div>
        <div className={styles.chips}>
          {FILTERS.map((f) => (
            <FilterChip
              key={f.value}
              active={filter === f.value}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </FilterChip>
          ))}
        </div>

        <form className={styles.composer} onSubmit={onSubmit}>
          <select
            className={styles.composerSelect}
            value={effectiveProjectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={projects.length === 0}
            aria-label="Projet"
          >
            {projects.length === 0 && <option value="">Aucun projet</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            className={styles.composerInput}
            placeholder="Ajouter une tâche…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={projects.length === 0 || submitting}
          />
          <button
            type="submit"
            className={styles.composerSubmit}
            disabled={!draft.trim() || !effectiveProjectId || submitting}
            aria-label="Ajouter"
          >
            <Plus size={16} strokeWidth={2} />
          </button>
        </form>
      </div>

      <div className={styles.content}>
        {loading && <SkeletonList count={4} />}
        {error && <p className={styles.state}>Erreur : {error}</p>}
        {!loading && !error && groups.length === 0 && (
          <p className={styles.state}>
            {filter === 'done'
              ? 'Aucune tâche terminée.'
              : filter === 'open'
              ? 'Rien à faire 🎉'
              : 'Aucune tâche.'}
          </p>
        )}

        {!loading &&
          !error &&
          groups.map((group) => {
            const items = filter === 'done' ? group.done : filter === 'all' ? [...group.open, ...group.done] : group.open;
            if (items.length === 0) return null;
            return (
              <section key={group.projectId ?? '__orphan__'} className={styles.group}>
                <header className={styles.groupHeader}>
                  {group.projectId ? (
                    <Link to={`/projects/${group.projectId}`} className={styles.groupLink}>
                      <span className={styles.groupName}>{group.projectName}</span>
                      <ChevronRight size={14} strokeWidth={1.5} />
                    </Link>
                  ) : (
                    <span className={styles.groupName}>{group.projectName}</span>
                  )}
                  <span className={styles.groupCount}>
                    {group.open.length > 0
                      ? `${group.open.length} ouverte${group.open.length > 1 ? 's' : ''}`
                      : `${group.done.length} terminée${group.done.length > 1 ? 's' : ''}`}
                  </span>
                </header>
                <ul className={styles.list}>
                  {items.map((todo) => (
                    <li
                      key={todo.id}
                      className={`${styles.item} ${todo.completed ? styles.itemDone : ''}`}
                    >
                      <button
                        type="button"
                        className={`${styles.check} ${todo.completed ? styles.checkOn : ''}`}
                        onClick={() => void toggle(todo.id, !todo.completed)}
                        aria-label={todo.completed ? 'Décocher' : 'Cocher'}
                      >
                        {todo.completed && <Check size={12} strokeWidth={2.5} />}
                      </button>
                      <span className={styles.text}>{todo.text}</span>
                      <span className={styles.date}>{relativeDate(todo.created_at)}</span>
                      <button
                        type="button"
                        className={styles.delete}
                        onClick={() => void remove(todo.id)}
                        aria-label="Supprimer"
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
      </div>
    </div>
  );
}

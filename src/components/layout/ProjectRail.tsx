import { Plus, Search } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { matchPath, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useProjects } from '../../hooks/useProjects';
import type { ProjectStatus } from '../../lib/types';
import { StatusBadge } from '../project/StatusBadge';
import styles from './ProjectRail.module.css';

type Filter = 'all' | ProjectStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: 'Actifs' },
  { value: 'idea', label: 'Idées' },
  { value: 'paused', label: 'Pause' },
];

export function ProjectRail() {
  const { projects, loading, insertProject } = useProjects();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const match = matchPath('/projects/:id', location.pathname);
  const activeId = match?.params.id;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (filter !== 'all' && p.status !== filter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.stack.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [projects, query, filter]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const name = draftName.trim();
    if (!name) return;
    const project = await insertProject({ name });
    setDraftName('');
    setCreating(false);
    if (project) navigate(`/projects/${project.id}`);
  }

  return (
    <aside className={styles.rail} aria-label="Liste des projets">
      <div className={styles.header}>
        <span className={styles.title}>Projets</span>
        <span className={styles.count}>{projects.length}</span>
        <button
          type="button"
          className={styles.add}
          onClick={() => setCreating((v) => !v)}
          aria-label="Nouveau projet"
        >
          <Plus size={16} strokeWidth={1.5} />
        </button>
      </div>

      {creating && (
        <form className={styles.createForm} onSubmit={onCreate}>
          <input
            autoFocus
            className={styles.createInput}
            placeholder="Nom du projet"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={() => {
              if (!draftName.trim()) setCreating(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setCreating(false);
                setDraftName('');
              }
            }}
          />
        </form>
      )}

      <div className={styles.searchWrap}>
        <Search size={14} strokeWidth={1.5} className={styles.searchIcon} />
        <input
          className={styles.search}
          placeholder="Filtrer…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className={styles.chips}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`${styles.chip} ${filter === f.value ? styles.chipActive : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className={styles.list}>
        {loading && <p className={styles.state}>Chargement…</p>}
        {!loading && filtered.length === 0 && (
          <p className={styles.state}>
            {query || filter !== 'all' ? 'Aucun résultat.' : 'Aucun projet.'}
          </p>
        )}
        {filtered.map((project) => (
          <NavLink
            key={project.id}
            to={`/projects/${project.id}`}
            className={`${styles.item} ${activeId === project.id ? styles.itemActive : ''}`}
          >
            <div className={styles.itemTop}>
              <span className={styles.name}>{project.name}</span>
              <StatusBadge status={project.status} />
            </div>
            {project.stack.length > 0 && (
              <span className={styles.stack}>{project.stack.slice(0, 3).join(' · ')}</span>
            )}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}

import { Plus, Settings as SettingsIcon } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectRow } from '../components/project/ProjectRow';
import { FilterChip } from '../components/ui/FilterChip';
import { SearchBar } from '../components/ui/SearchBar';
import { useProjects } from '../hooks/useProjects';
import type { ProjectStatus } from '../lib/types';
import styles from './Dashboard.module.css';

type Filter = 'all' | ProjectStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: 'Actifs' },
  { value: 'paused', label: 'En pause' },
  { value: 'idea', label: 'Idées' },
  { value: 'abandoned', label: 'Abandonnés' },
];

export default function Dashboard() {
  const { projects, loading, error, insertProject } = useProjects();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

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

  const activeCount = projects.filter((p) => p.status === 'active').length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.counter}>
            {projects.length} projet{projects.length > 1 ? 's' : ''} ·{' '}
            {activeCount} actif{activeCount > 1 ? 's' : ''}
          </p>
          <h1 className={styles.title}>Projets</h1>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => navigate('/settings')}
            aria-label="Réglages"
          >
            <SettingsIcon size={18} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => setModalOpen(true)}
            aria-label="Nouveau projet"
          >
            <Plus size={20} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Rechercher projets, notes, stack…"
        showKbd
      />

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

      <div className={styles.list}>
        {loading && <p className={styles.state}>Chargement…</p>}
        {error && <p className={styles.state}>Erreur : {error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <p className={styles.state}>
            {query || filter !== 'all'
              ? 'Aucun projet ne correspond.'
              : 'Aucun projet. Crée-en un avec +.'}
          </p>
        )}
        {!loading &&
          !error &&
          filtered.map((project) => <ProjectRow key={project.id} project={project} />)}
      </div>

      {modalOpen && (
        <NewProjectModal
          onClose={() => setModalOpen(false)}
          onCreate={async (name, description) => {
            const project = await insertProject({ name, description });
            if (project) {
              setModalOpen(false);
              navigate(`/projects/${project.id}`);
            }
          }}
        />
      )}
    </div>
  );
}

interface ModalProps {
  onClose: () => void;
  onCreate: (name: string, description: string) => Promise<void>;
}

function NewProjectModal({ onClose, onCreate }: ModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onCreate(name.trim(), description.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <form
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
      >
        <h2 className={styles.modalTitle}>Nouveau projet</h2>
        <input
          className={styles.input}
          placeholder="Nom"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <textarea
          className={styles.textarea}
          placeholder="Description (optionnel)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className={styles.modalActions}>
          <button type="button" className={styles.secondary} onClick={onClose}>
            Annuler
          </button>
          <button
            type="submit"
            className={styles.primary}
            disabled={busy || !name.trim()}
          >
            Créer
          </button>
        </div>
      </form>
    </div>
  );
}

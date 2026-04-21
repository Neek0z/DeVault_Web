import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FilterChip } from '../components/ui/FilterChip';
import { SearchBar } from '../components/ui/SearchBar';
import { useIdeas } from '../hooks/useIdeas';
import { relativeDate } from '../lib/date';
import type { Idea } from '../lib/types';
import styles from './Ideas.module.css';

const CATEGORIES = ['App mobile', 'Outil interne', 'Feature', 'Side project'];

export default function Ideas() {
  const { ideas, loading, error, insertIdea, updateIdea, deleteIdea, promoteToProject } =
    useIdeas();
  const [modalOpen, setModalOpen] = useState(false);
  const [editIdea, setEditIdea] = useState<Idea | null>(null);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ideas;
    return ideas.filter(
      (i) =>
        i.body.toLowerCase().includes(q) ||
        i.title?.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q)
    );
  }, [ideas, query]);

  async function handlePromote(idea: Idea) {
    const ok = window.confirm(`Promouvoir cette idée en projet ?`);
    if (!ok) return;
    const project = await promoteToProject(idea);
    if (project) navigate(`/projects/${project.id}`);
  }

  async function handleDelete(id: string) {
    const ok = window.confirm('Supprimer cette idée ?');
    if (!ok) return;
    await deleteIdea(id);
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <Link to="/" className={styles.back}>
          <ChevronLeft size={18} strokeWidth={1.5} /> Projets
        </Link>
        <div className={styles.header}>
          <h1 className={styles.title}>Idées</h1>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => setModalOpen(true)}
            aria-label="Nouvelle idée"
          >
            <Plus size={20} strokeWidth={1.5} />
          </button>
        </div>
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Rechercher une idée…"
        />
      </div>

      <div className={styles.content}>
        {loading && <p className={styles.state}>Chargement…</p>}
        {error && <p className={styles.state}>Erreur : {error}</p>}
        {!loading && !error && ideas.length === 0 && (
          <p className={styles.state}>Aucune idée. Jette-en une avec +.</p>
        )}
        {!loading && !error && ideas.length > 0 && filtered.length === 0 && (
          <p className={styles.state}>Aucune idée ne correspond.</p>
        )}

        <div className={styles.list}>
          {filtered.map((idea) => (
          <div
            key={idea.id}
            className={styles.card}
            role="button"
            tabIndex={0}
            onClick={() => setEditIdea(idea)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setEditIdea(idea);
              }
            }}
          >
            <button
              type="button"
              className={styles.delete}
              onClick={(e) => {
                e.stopPropagation();
                void handleDelete(idea.id);
              }}
              aria-label="Supprimer"
            >
              <Trash2 size={14} strokeWidth={1.5} />
            </button>
            {idea.title && <span className={styles.cardTitle}>{idea.title}</span>}
            <p className={styles.body}>{idea.body}</p>
            <div className={styles.meta}>
              <div className={styles.categoryRow}>
                {idea.category && <span className={styles.category}>{idea.category}</span>}
                {idea.promoted_to_project_id && (
                  <span className={styles.promoted}>Promu ✓</span>
                )}
              </div>
              <span className={styles.date}>{relativeDate(idea.created_at)}</span>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.promote}
                disabled={Boolean(idea.promoted_to_project_id)}
                onClick={(e) => {
                  e.stopPropagation();
                  void handlePromote(idea);
                }}
              >
                Promouvoir →
              </button>
            </div>
          </div>
        ))}
        </div>
      </div>

      {modalOpen && (
        <IdeaModal
          onClose={() => setModalOpen(false)}
          onSubmit={async (input) => {
            const idea = await insertIdea(input);
            if (idea) setModalOpen(false);
          }}
        />
      )}

      {editIdea && (
        <IdeaModal
          initial={editIdea}
          onClose={() => setEditIdea(null)}
          onSubmit={async (input) => {
            const saved = await updateIdea(editIdea.id, input);
            if (saved) setEditIdea(null);
          }}
        />
      )}
    </div>
  );
}

interface ModalProps {
  onClose: () => void;
  onSubmit: (input: { title: string | null; body: string; category: string | null }) => Promise<void>;
  initial?: Idea;
}

function IdeaModal({ onClose, onSubmit: onSubmitProp, initial }: ModalProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [category, setCategory] = useState<string | null>(initial?.category ?? null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      await onSubmitProp({
        title: title.trim() || null,
        body: body.trim(),
        category,
      });
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
        <h2 className={styles.modalTitle}>{initial ? 'Éditer l\'idée' : 'Nouvelle idée'}</h2>
        <textarea
          className={styles.textarea}
          placeholder="Ton idée…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          autoFocus
          required
        />
        <input
          className={styles.input}
          placeholder="Titre (optionnel)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className={styles.chips}>
          {CATEGORIES.map((c) => (
            <FilterChip
              key={c}
              active={category === c}
              onClick={() => setCategory(category === c ? null : c)}
            >
              {c}
            </FilterChip>
          ))}
        </div>
        <div className={styles.modalActions}>
          <button type="button" className={styles.secondary} onClick={onClose}>
            Annuler
          </button>
          <button
            type="submit"
            className={styles.primary}
            disabled={busy || !body.trim()}
          >
            {initial ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </form>
    </div>
  );
}

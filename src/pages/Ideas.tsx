import { Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilterChip } from '../components/ui/FilterChip';
import { useIdeas } from '../hooks/useIdeas';
import { relativeDate } from '../lib/date';
import type { Idea } from '../lib/types';
import styles from './Ideas.module.css';

const CATEGORIES = ['App mobile', 'Outil interne', 'Feature', 'Side project'];

export default function Ideas() {
  const { ideas, loading, error, insertIdea, deleteIdea, promoteToProject } = useIdeas();
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

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

      {loading && <p className={styles.state}>Chargement…</p>}
      {error && <p className={styles.state}>Erreur : {error}</p>}
      {!loading && !error && ideas.length === 0 && (
        <p className={styles.state}>Aucune idée. Jette-en une avec +.</p>
      )}

      <div className={styles.list}>
        {ideas.map((idea) => (
          <div key={idea.id} className={styles.card}>
            <button
              type="button"
              className={styles.delete}
              onClick={() => void handleDelete(idea.id)}
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
                onClick={() => void handlePromote(idea)}
              >
                Promouvoir →
              </button>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <IdeaModal
          onClose={() => setModalOpen(false)}
          onCreate={async (input) => {
            const idea = await insertIdea(input);
            if (idea) setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

interface ModalProps {
  onClose: () => void;
  onCreate: (input: { title: string | null; body: string; category: string | null }) => Promise<void>;
}

function IdeaModal({ onClose, onCreate }: ModalProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      await onCreate({
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
        <h2 className={styles.modalTitle}>Nouvelle idée</h2>
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
            Créer
          </button>
        </div>
      </form>
    </div>
  );
}

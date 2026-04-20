import { Bug, FileText, Lightbulb, Scale, X } from 'lucide-react';
import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { StatusBadge } from '../components/project/StatusBadge';
import { useJournal } from '../hooks/useJournal';
import { useProject } from '../hooks/useProject';
import type { JournalType } from '../lib/types';
import styles from './JournalNew.module.css';

const TYPES: { value: JournalType; label: string; Icon: typeof FileText }[] = [
  { value: 'note', label: 'Note', Icon: FileText },
  { value: 'idea', label: 'Idée', Icon: Lightbulb },
  { value: 'bug', label: 'Bug', Icon: Bug },
  { value: 'decision', label: 'Decision', Icon: Scale },
];

export default function JournalNew() {
  const [params] = useSearchParams();
  const projectId = params.get('projectId') ?? undefined;
  const navigate = useNavigate();
  const { project } = useProject(projectId);
  const { insertEntry } = useJournal(projectId);

  const [type, setType] = useState<JournalType>('note');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bodyRef = (node: HTMLTextAreaElement | null) => {
    if (node) node.focus();
  };

  if (!projectId) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) {
      setError('Le corps est requis.');
      return;
    }
    setBusy(true);
    setError(null);
    const entry = await insertEntry({
      project_id: projectId!,
      type,
      title: title.trim() || null,
      body: body.trim(),
      tags,
    });
    setBusy(false);
    if (entry) navigate(-1);
    else setError('Impossible de sauvegarder.');
  }

  function onTagKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const v = tagDraft.trim().replace(/^#/, '');
      if (v && !tags.includes(v)) setTags([...tags, v]);
      setTagDraft('');
    } else if (e.key === 'Backspace' && !tagDraft && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  }

  return (
    <form className={styles.page} onSubmit={onSubmit}>
      <div className={styles.header}>
        <button type="button" className={styles.cancel} onClick={() => navigate(-1)}>
          Annuler
        </button>
        <span className={styles.headerTitle}>New entry</span>
        <button type="submit" className={styles.save} disabled={busy || !body.trim()}>
          {busy ? '…' : 'Save'}
        </button>
      </div>

      {project && (
        <span className={styles.projectChip}>
          <span className={styles.projectAvatar}>
            {project.name.slice(0, 2).toUpperCase()}
          </span>
          {project.name}
          <StatusBadge status={project.status} />
        </span>
      )}

      <div className={styles.typeGrid}>
        {TYPES.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            className={`${styles.typeCard} ${type === value ? styles.typeActive : ''}`}
            onClick={() => setType(value)}
          >
            <Icon size={18} strokeWidth={1.5} />
            {label}
          </button>
        ))}
      </div>

      <input
        className={styles.title}
        placeholder="Titre (optionnel)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        ref={bodyRef}
        className={styles.body}
        placeholder="Repro steps, a thought, what else…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
      />

      <div className={styles.tagsRow}>
        {tags.map((t) => (
          <span key={t} className={styles.tag}>
            #{t}
            <button
              type="button"
              className={styles.tagRemove}
              onClick={() => setTags(tags.filter((x) => x !== t))}
              aria-label={`Retirer ${t}`}
            >
              <X size={10} strokeWidth={2} />
            </button>
          </span>
        ))}
        <input
          className={styles.tagInput}
          placeholder="#tag + entrée"
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          onKeyDown={onTagKey}
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

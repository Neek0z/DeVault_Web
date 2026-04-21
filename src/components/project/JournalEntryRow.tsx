import { Bug, FileText, Lightbulb, Scale, Trash2, X } from 'lucide-react';
import {
  useState,
  type ComponentType,
  type FormEvent,
  type KeyboardEvent,
  type SVGProps,
} from 'react';
import { relativeDate } from '../../lib/date';
import type { JournalEntry, JournalType } from '../../lib/types';
import styles from './JournalEntryRow.module.css';

type IconComponent = ComponentType<
  SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }
>;

const ICONS: Record<JournalType, IconComponent> = {
  note: FileText,
  idea: Lightbulb,
  bug: Bug,
  decision: Scale,
};

const LABELS: Record<JournalType, string> = {
  note: 'Note',
  idea: 'Idée',
  bug: 'Bug',
  decision: 'Decision',
};

interface Props {
  entry: JournalEntry;
  onDelete: (id: string) => Promise<boolean>;
  onUpdate?: (
    id: string,
    patch: { title: string | null; body: string; tags: string[] }
  ) => Promise<JournalEntry | null>;
}

export function JournalEntryRow({ entry, onDelete, onUpdate }: Props) {
  const Icon = ICONS[entry.type];
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(entry.title ?? '');
  const [body, setBody] = useState(entry.body);
  const [tags, setTags] = useState<string[]>(entry.tags);
  const [tagDraft, setTagDraft] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    const ok = window.confirm('Supprimer cette entrée ?');
    if (!ok) return;
    await onDelete(entry.id);
  }

  function enterEdit() {
    if (!onUpdate) return;
    setTitle(entry.title ?? '');
    setBody(entry.body);
    setTags(entry.tags);
    setTagDraft('');
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
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

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!onUpdate || !body.trim()) return;
    setBusy(true);
    try {
      const saved = await onUpdate(entry.id, {
        title: title.trim() || null,
        body: body.trim(),
        tags,
      });
      if (saved) setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <form className={styles.row} onSubmit={onSave}>
        <span className={styles.icon}>
          <Icon size={18} strokeWidth={1.5} />
        </span>
        <div className={styles.body}>
          <input
            className={styles.editInput}
            placeholder="Titre (optionnel)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className={styles.editTextarea}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
          <div className={styles.tags}>
            {tags.map((t) => (
              <span key={t} className={styles.tagEditable}>
                #{t}
                <button
                  type="button"
                  onClick={() => setTags(tags.filter((x) => x !== t))}
                  aria-label={`Retirer ${t}`}
                >
                  <X size={10} strokeWidth={2} />
                </button>
              </span>
            ))}
            <input
              className={styles.tagInput}
              placeholder="#tag"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={onTagKey}
            />
          </div>
          <div className={styles.editActions}>
            <button type="button" className={styles.editCancel} onClick={cancel}>
              Annuler
            </button>
            <button
              type="submit"
              className={styles.editSave}
              disabled={busy || !body.trim()}
            >
              {busy ? '…' : 'Sauvegarder'}
            </button>
          </div>
        </div>
        <span />
      </form>
    );
  }

  const displayTitle = entry.title?.trim() || entry.body.trim().slice(0, 80);

  return (
    <div
      className={styles.row}
      role={onUpdate ? 'button' : undefined}
      tabIndex={onUpdate ? 0 : undefined}
      onClick={enterEdit}
      onKeyDown={(e) => {
        if (onUpdate && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          enterEdit();
        }
      }}
    >
      <span className={styles.icon}>
        <Icon size={18} strokeWidth={1.5} />
      </span>
      <div className={styles.body}>
        <span className={styles.title}>{displayTitle}</span>
        <span className={styles.meta}>
          {relativeDate(entry.created_at)} · {LABELS[entry.type]}
        </span>
        {entry.tags.length > 0 && (
          <div className={styles.tags}>
            {entry.tags.map((t) => (
              <span key={t} className={styles.tag}>
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        className={styles.delete}
        onClick={(e) => {
          e.stopPropagation();
          void handleDelete();
        }}
        aria-label="Supprimer l'entrée"
      >
        <Trash2 size={16} strokeWidth={1.5} />
      </button>
    </div>
  );
}

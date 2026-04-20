import { Bug, FileText, Lightbulb, Scale, Trash2 } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import { relativeDate } from '../../lib/date';
import type { JournalEntry, JournalType } from '../../lib/types';
import styles from './JournalEntryRow.module.css';

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }>;

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
}

export function JournalEntryRow({ entry, onDelete }: Props) {
  const Icon = ICONS[entry.type];

  async function handleDelete() {
    const ok = window.confirm('Supprimer cette entrée ?');
    if (!ok) return;
    await onDelete(entry.id);
  }

  const displayTitle = entry.title?.trim() || entry.body.trim().slice(0, 80);

  return (
    <div className={styles.row}>
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
        onClick={handleDelete}
        aria-label="Supprimer l'entrée"
      >
        <Trash2 size={16} strokeWidth={1.5} />
      </button>
    </div>
  );
}

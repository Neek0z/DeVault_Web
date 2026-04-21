import { X } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Todo } from '../../lib/types';
import styles from './TodoItem.module.css';

interface Props {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void | Promise<unknown>;
  onDelete: (id: string) => void | Promise<unknown>;
  onUpdate?: (id: string, text: string) => Promise<boolean>;
}

export function TodoItem({ todo, onToggle, onDelete, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function enterEdit() {
    if (!onUpdate) return;
    setDraft(todo.text);
    setEditing(true);
  }

  async function commit() {
    const v = draft.trim();
    if (!onUpdate || !v || v === todo.text) {
      setEditing(false);
      return;
    }
    const ok = await onUpdate(todo.id, v);
    if (ok) setEditing(false);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditing(false);
    }
  }

  return (
    <div className={styles.row}>
      <input
        type="checkbox"
        className={styles.checkbox}
        checked={todo.completed}
        onChange={(e) => void onToggle(todo.id, e.target.checked)}
        aria-label={todo.completed ? 'Marquer comme à faire' : 'Marquer comme fait'}
      />
      {editing ? (
        <input
          ref={inputRef}
          className={styles.edit}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onKey}
        />
      ) : (
        <span
          className={`${styles.text} ${todo.completed ? styles.done : ''}`}
          onDoubleClick={enterEdit}
          title={onUpdate ? 'Double-clic pour éditer' : undefined}
        >
          {todo.text}
        </span>
      )}
      <button
        type="button"
        className={styles.remove}
        onClick={() => void onDelete(todo.id)}
        aria-label="Supprimer la tâche"
      >
        <X size={14} strokeWidth={1.8} />
      </button>
    </div>
  );
}

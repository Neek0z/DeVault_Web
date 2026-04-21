import { X } from 'lucide-react';
import type { Todo } from '../../lib/types';
import styles from './TodoItem.module.css';

interface Props {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void | Promise<unknown>;
  onDelete: (id: string) => void | Promise<unknown>;
}

export function TodoItem({ todo, onToggle, onDelete }: Props) {
  return (
    <div className={styles.row}>
      <input
        type="checkbox"
        className={styles.checkbox}
        checked={todo.completed}
        onChange={(e) => void onToggle(todo.id, e.target.checked)}
        aria-label={todo.completed ? 'Marquer comme à faire' : 'Marquer comme fait'}
      />
      <span className={`${styles.text} ${todo.completed ? styles.done : ''}`}>
        {todo.text}
      </span>
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

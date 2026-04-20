import { X } from 'lucide-react';
import styles from './StackTag.module.css';

interface Props {
  label: string;
  onRemove?: () => void;
}

export function StackTag({ label, onRemove }: Props) {
  return (
    <span className={styles.tag}>
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className={styles.remove}
          aria-label={`Retirer ${label}`}
        >
          <X size={12} strokeWidth={1.8} />
        </button>
      )}
    </span>
  );
}

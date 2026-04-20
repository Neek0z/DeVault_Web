import type { ReactNode } from 'react';
import styles from './FilterChip.module.css';

interface Props {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}

export function FilterChip({ active, onClick, children }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${styles.chip} ${active ? styles.active : ''}`}
    >
      {children}
    </button>
  );
}

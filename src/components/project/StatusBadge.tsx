import type { ProjectStatus } from '../../lib/types';
import styles from './StatusBadge.module.css';

const LABELS: Record<ProjectStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  idea: 'Idea',
  abandoned: 'Abandoned',
};

interface Props {
  status: ProjectStatus;
  className?: string;
}

export function StatusBadge({ status, className }: Props) {
  return (
    <span className={`${styles.badge} ${className ?? ''}`}>
      <span className={`${styles.dot} ${styles[status]}`} aria-hidden />
      {LABELS[status]}
    </span>
  );
}

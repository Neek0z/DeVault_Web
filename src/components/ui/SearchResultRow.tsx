import type { ComponentType, SVGProps } from 'react';
import styles from './SearchResultRow.module.css';

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }>;

interface Props {
  Icon: IconComponent;
  title: string;
  snippet?: string;
  badge?: string;
  onClick: () => void;
}

export function SearchResultRow({ Icon, title, snippet, badge, onClick }: Props) {
  return (
    <button type="button" className={styles.row} onClick={onClick}>
      <span className={styles.icon}>
        <Icon size={18} strokeWidth={1.5} />
      </span>
      <div className={styles.body}>
        <span className={styles.title}>{title}</span>
        {snippet && <span className={styles.snippet}>{snippet}</span>}
      </div>
      {badge && <span className={styles.badge}>{badge}</span>}
    </button>
  );
}

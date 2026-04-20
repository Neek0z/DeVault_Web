import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { relativeDate } from '../../lib/date';
import type { Project } from '../../lib/types';
import { StatusBadge } from './StatusBadge';
import styles from './ProjectRow.module.css';

interface Props {
  project: Project;
}

export function ProjectRow({ project }: Props) {
  const navigate = useNavigate();

  return (
    <div
      className={styles.row}
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/projects/${project.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/projects/${project.id}`);
        }
      }}
    >
      <div className={styles.top}>
        <span className={styles.name}>{project.name}</span>
        <ChevronRight size={18} strokeWidth={1.5} className={styles.chevron} />
      </div>
      {project.stack.length > 0 && (
        <div className={styles.stack}>{project.stack.join(' · ')}</div>
      )}
      {project.description && (
        <p className={styles.description}>{project.description}</p>
      )}
      <div className={styles.bottom}>
        <StatusBadge status={project.status} />
        <span className={styles.date}>{relativeDate(project.updated_at)}</span>
      </div>
    </div>
  );
}

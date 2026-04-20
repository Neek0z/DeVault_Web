import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { Credential } from '../../lib/types';
import styles from './CredentialRow.module.css';

function initials(service: string): string {
  const clean = service.trim();
  if (!clean) return '?';
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

interface Props {
  credential: Credential;
  onDelete: (id: string) => Promise<boolean>;
}

export function CredentialRow({ credential, onDelete }: Props) {
  const [open, setOpen] = useState(false);

  async function handleDelete() {
    const ok = window.confirm(`Supprimer « ${credential.service} » ?`);
    if (!ok) return;
    await onDelete(credential.id);
  }

  return (
    <div className={styles.row}>
      <div
        className={styles.head}
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
      >
        <span className={styles.avatar}>{initials(credential.service)}</span>
        <div className={styles.info}>
          <span className={styles.service}>{credential.service}</span>
          {credential.login && <span className={styles.login}>{credential.login}</span>}
        </div>
        <ChevronRight
          size={18}
          strokeWidth={1.5}
          className={`${styles.chev} ${open ? styles.chevOpen : ''}`}
        />
      </div>

      {open && (
        <div className={styles.body}>
          {credential.url && (
            <div className={styles.field}>
              <span className={styles.label}>URL</span>
              <a
                className={styles.url}
                href={credential.url}
                target="_blank"
                rel="noreferrer"
              >
                {credential.url}
              </a>
            </div>
          )}
          {credential.notes && (
            <div className={styles.field}>
              <span className={styles.label}>Notes</span>
              <p className={styles.notes}>{credential.notes}</p>
            </div>
          )}
          <button type="button" className={styles.delete} onClick={handleDelete}>
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}

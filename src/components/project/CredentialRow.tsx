import { ChevronRight, ExternalLink } from 'lucide-react';
import { useState, type FormEvent } from 'react';
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
  onUpdate?: (
    id: string,
    patch: {
      service?: string;
      login?: string | null;
      url?: string | null;
      notes?: string | null;
    }
  ) => Promise<Credential | null>;
}

export function CredentialRow({ credential, onDelete, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [tracked, setTracked] = useState(credential);
  const [service, setService] = useState(credential.service);
  const [login, setLogin] = useState(credential.login ?? '');
  const [url, setUrl] = useState(credential.url ?? '');
  const [notes, setNotes] = useState(credential.notes ?? '');
  const [busy, setBusy] = useState(false);

  if (tracked !== credential) {
    setTracked(credential);
    setService(credential.service);
    setLogin(credential.login ?? '');
    setUrl(credential.url ?? '');
    setNotes(credential.notes ?? '');
  }

  const dirty =
    service.trim() !== credential.service.trim() ||
    login.trim() !== (credential.login ?? '').trim() ||
    url.trim() !== (credential.url ?? '').trim() ||
    notes !== (credential.notes ?? '');

  async function handleDelete() {
    const ok = window.confirm(`Supprimer « ${credential.service} » ?`);
    if (!ok) return;
    await onDelete(credential.id);
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!onUpdate || !service.trim() || !dirty) return;
    setBusy(true);
    try {
      await onUpdate(credential.id, {
        service: service.trim(),
        login: login.trim() || null,
        url: url.trim() || null,
        notes: notes.trim() || null,
      });
    } finally {
      setBusy(false);
    }
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
        <form className={styles.body} onSubmit={onSave}>
          <div className={styles.field}>
            <span className={styles.label}>Service</span>
            <input
              className={styles.editInput}
              value={service}
              onChange={(e) => setService(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Login</span>
            <input
              className={styles.editInput}
              value={login}
              onChange={(e) => setLogin(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>URL</span>
            <div className={styles.urlRow}>
              <input
                className={styles.editInput}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                type="url"
              />
              {credential.url && (
                <a
                  className={styles.openUrl}
                  href={credential.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Ouvrir"
                >
                  <ExternalLink size={14} strokeWidth={1.5} />
                </a>
              )}
            </div>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Notes</span>
            <textarea
              className={styles.editTextarea}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.delete} onClick={handleDelete}>
              Supprimer
            </button>
            {onUpdate && (
              <button
                type="submit"
                className={styles.save}
                disabled={busy || !dirty || !service.trim()}
              >
                {busy ? '…' : 'Sauvegarder'}
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

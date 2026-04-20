import { FileText, FolderOpen, Key } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchResultRow } from '../components/ui/SearchResultRow';
import { supabase } from '../lib/supabase';
import type { Credential, JournalEntry, Project } from '../lib/types';
import styles from './Search.module.css';

interface Results {
  projects: Project[];
  entries: JournalEntry[];
  credentials: Credential[];
}

const EMPTY: Results = { projects: [], entries: [], credentials: [] };

function escapeIlike(value: string): string {
  return value.replace(/[%,]/g, (c) => `\\${c}`);
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Results>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();
  const timerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);

    const trimmed = query.trim();
    let cancelled = false;

    (async () => {
      await null;
      if (cancelled) return;
      if (trimmed.length < 2) {
        setResults(EMPTY);
        setLoading(false);
        setSearched(false);
        return;
      }
      setLoading(true);
    })();

    if (trimmed.length < 2) {
      return () => {
        cancelled = true;
      };
    }

    timerRef.current = window.setTimeout(() => {
      const like = `%${escapeIlike(trimmed)}%`;
      (async () => {
        const [projects, entries, credentials] = await Promise.all([
          supabase
            .from('projects')
            .select('*')
            .or(`name.ilike.${like},description.ilike.${like}`)
            .limit(10),
          supabase
            .from('journal_entries')
            .select('*')
            .or(`title.ilike.${like},body.ilike.${like}`)
            .limit(10),
          supabase
            .from('credentials')
            .select('*')
            .or(`service.ilike.${like},login.ilike.${like}`)
            .limit(10),
        ]);
        if (cancelled) return;
        setResults({
          projects: (projects.data ?? []) as Project[],
          entries: (entries.data ?? []) as JournalEntry[],
          credentials: (credentials.data ?? []) as Credential[],
        });
        setLoading(false);
        setSearched(true);
      })();
    }, 300);

    return () => {
      cancelled = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [query]);

  const { projects, entries, credentials } = results;
  const total = projects.length + entries.length + credentials.length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <input
          ref={inputRef}
          type="search"
          className={styles.input}
          placeholder="Rechercher projets, notes, identifiants…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          className={styles.cancel}
          onClick={() => navigate(-1)}
        >
          Annuler
        </button>
      </div>

      {query.trim().length > 0 && query.trim().length < 2 && (
        <p className={styles.state}>Tape au moins 2 caractères.</p>
      )}
      {loading && <p className={styles.state}>Recherche…</p>}
      {!loading && searched && total === 0 && (
        <p className={styles.state}>Aucun résultat pour « {query.trim()} ».</p>
      )}

      {!loading && projects.length > 0 && (
        <section className={styles.section}>
          <span className={styles.sectionLabel}>Projets</span>
          {projects.map((p) => (
            <SearchResultRow
              key={p.id}
              Icon={FolderOpen}
              title={p.name}
              snippet={p.description ?? p.stack.join(' · ')}
              badge={p.status}
              onClick={() => navigate(`/projects/${p.id}`)}
            />
          ))}
        </section>
      )}

      {!loading && entries.length > 0 && (
        <section className={styles.section}>
          <span className={styles.sectionLabel}>Journal</span>
          {entries.map((e) => (
            <SearchResultRow
              key={e.id}
              Icon={FileText}
              title={e.title?.trim() || e.body.trim().slice(0, 60)}
              snippet={e.body}
              badge={e.type}
              onClick={() => navigate(`/projects/${e.project_id}`)}
            />
          ))}
        </section>
      )}

      {!loading && credentials.length > 0 && (
        <section className={styles.section}>
          <span className={styles.sectionLabel}>Identifiants</span>
          {credentials.map((c) => (
            <SearchResultRow
              key={c.id}
              Icon={Key}
              title={c.service}
              snippet={c.login ?? c.url ?? undefined}
              badge="cred"
              onClick={() => navigate(`/projects/${c.project_id}`)}
            />
          ))}
        </section>
      )}
    </div>
  );
}

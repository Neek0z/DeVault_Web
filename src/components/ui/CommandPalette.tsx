import {
  Clock,
  FolderKanban,
  Lightbulb,
  ListTodo,
  Plus,
  Search,
  Settings as SettingsIcon,
  Sparkles,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useIdeas } from '../../hooks/useIdeas';
import { useProjects } from '../../hooks/useProjects';
import styles from './CommandPalette.module.css';

interface Item {
  id: string;
  title: string;
  hint?: string;
  group: 'Actions' | 'Projets' | 'Idées' | 'Navigation';
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  run: () => void;
}

interface Props {
  onClose: () => void;
  onOpenAssistant: () => void;
}

function fuzzyScore(query: string, text: string): number {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return 100 + (t.startsWith(q) ? 20 : 0);
  // simple subsequence
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length ? 50 - (t.length - q.length) : -1;
}

export function CommandPalette({ onClose, onOpenAssistant }: Props) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [trackedQuery, setTrackedQuery] = useState(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { projects } = useProjects();
  const { ideas } = useIdeas();

  // Reset active selection when the query changes (in-render guard pattern).
  if (trackedQuery !== query) {
    setTrackedQuery(query);
    setActive(0);
  }

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const items = useMemo<Item[]>(() => {
    const list: Item[] = [
      {
        id: 'nav:home',
        title: 'Aller au tableau de bord',
        group: 'Navigation',
        icon: FolderKanban,
        run: () => navigate('/'),
      },
      {
        id: 'nav:ideas',
        title: 'Toutes les idées',
        group: 'Navigation',
        icon: Lightbulb,
        run: () => navigate('/ideas'),
      },
      {
        id: 'nav:search',
        title: 'Recherche globale',
        group: 'Navigation',
        icon: Search,
        run: () => navigate('/search'),
      },
      {
        id: 'nav:history',
        title: 'Historique',
        group: 'Navigation',
        icon: Clock,
        run: () => navigate('/history'),
      },
      {
        id: 'nav:settings',
        title: 'Paramètres',
        group: 'Navigation',
        icon: SettingsIcon,
        run: () => navigate('/settings'),
      },
      {
        id: 'act:assistant',
        title: 'Ouvrir l’assistant IA',
        hint: '⌘ /',
        group: 'Actions',
        icon: Sparkles,
        run: onOpenAssistant,
      },
      {
        id: 'act:new-idea',
        title: 'Nouvelle idée',
        hint: '⌘ I',
        group: 'Actions',
        icon: Plus,
        run: () => navigate('/ideas'),
      },
    ];
    for (const p of projects) {
      list.push({
        id: `proj:${p.id}`,
        title: p.name,
        hint: p.stack.slice(0, 3).join(' · ') || p.status,
        group: 'Projets',
        icon: FolderKanban,
        run: () => navigate(`/projects/${p.id}`),
      });
    }
    for (const i of ideas.slice(0, 30)) {
      list.push({
        id: `idea:${i.id}`,
        title: i.title?.trim() || i.body.slice(0, 60),
        hint: i.category ?? undefined,
        group: 'Idées',
        icon: Lightbulb,
        run: () => navigate('/ideas'),
      });
    }
    return list;
  }, [projects, ideas, navigate, onOpenAssistant]);

  const filtered = useMemo<Item[]>(() => {
    const q = query.trim();
    if (!q) return items.slice(0, 30);
    return items
      .map((it) => ({
        it,
        score: Math.max(
          fuzzyScore(q, it.title),
          it.hint ? fuzzyScore(q, it.hint) : -1
        ),
      }))
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map((x) => x.it);
  }, [items, query]);

  function runItem(item: Item | undefined) {
    if (!item) return;
    item.run();
    onClose();
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runItem(filtered[active]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  // group items in render order while preserving the global active index
  const grouped: Array<{ group: Item['group']; items: { item: Item; index: number }[] }> = [];
  filtered.forEach((item, index) => {
    const last = grouped[grouped.length - 1];
    if (last && last.group === item.group) last.items.push({ item, index });
    else grouped.push({ group: item.group, items: [{ item, index }] });
  });

  return createPortal(
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={styles.palette}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Palette de commandes"
      >
        <div className={styles.inputWrap}>
          <Search size={16} strokeWidth={1.5} className={styles.inputIcon} />
          <input
            ref={inputRef}
            className={styles.input}
            placeholder="Rechercher un projet, une idée, une action…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
          />
          <span className={styles.kbd}>esc</span>
        </div>

        <div className={styles.list}>
          {filtered.length === 0 && (
            <p className={styles.empty}>Aucun résultat.</p>
          )}
          {grouped.map(({ group, items: groupItems }) => (
            <div key={group} className={styles.group}>
              <span className={styles.groupLabel}>{group}</span>
              {groupItems.map(({ item, index }) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.item} ${
                      index === active ? styles.itemActive : ''
                    }`}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => runItem(item)}
                  >
                    <Icon size={15} strokeWidth={1.5} />
                    <span className={styles.itemTitle}>{item.title}</span>
                    {item.hint && <span className={styles.itemHint}>{item.hint}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className={styles.foot}>
          <span><span className={styles.kbd}>↑↓</span> naviguer</span>
          <span><span className={styles.kbd}>↵</span> ouvrir</span>
          <span className={styles.lastTodo}>
            <ListTodo size={12} strokeWidth={1.5} /> {projects.length} projets · {ideas.length} idées
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}

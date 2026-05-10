import { Clock, Command, Home, Lightbulb, Search, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';

const items = [
  { to: '/', label: 'Projets', icon: Home, end: true },
  { to: '/ideas', label: 'Idées', icon: Lightbulb },
  { to: '/search', label: 'Recherche', icon: Search },
  { to: '/history', label: 'Historique', icon: Clock },
  { to: '/settings', label: 'Paramètres', icon: Settings },
];

interface Props {
  onOpenPalette: () => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export function Sidebar({ onOpenPalette }: Props) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>DeVault</div>
      <button type="button" className={styles.paletteBtn} onClick={onOpenPalette}>
        <Command size={14} strokeWidth={1.5} />
        <span>Commandes…</span>
        <span className={styles.kbd}>{isMac ? '⌘' : 'Ctrl'} K</span>
      </button>
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          <Icon size={18} strokeWidth={1.5} />
          {label}
        </NavLink>
      ))}
    </aside>
  );
}

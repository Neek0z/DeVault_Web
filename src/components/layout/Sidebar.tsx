import { Home, Lightbulb, Search, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';

const items = [
  { to: '/', label: 'Projets', icon: Home, end: true },
  { to: '/ideas', label: 'Idées', icon: Lightbulb },
  { to: '/search', label: 'Recherche', icon: Search },
  { to: '/settings', label: 'Paramètres', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>DeVault</div>
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

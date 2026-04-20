import { Home, Lightbulb, Search, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import styles from './BottomNav.module.css';

const items = [
  { to: '/', label: 'Projets', icon: Home, end: true },
  { to: '/ideas', label: 'Idées', icon: Lightbulb },
  { to: '/search', label: 'Recherche', icon: Search },
  { to: '/settings', label: 'Réglages', icon: Settings },
];

export function BottomNav() {
  return (
    <nav className={styles.nav}>
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          <Icon size={22} strokeWidth={1.5} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

import { Search } from 'lucide-react';
import styles from './SearchBar.module.css';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showKbd?: boolean;
}

export function SearchBar({ value, onChange, placeholder = 'Rechercher…', showKbd }: Props) {
  return (
    <div className={styles.wrapper}>
      <Search size={16} strokeWidth={1.5} className={styles.icon} />
      <input
        type="search"
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {showKbd && <kbd className={styles.kbd}>⌘K</kbd>}
    </div>
  );
}

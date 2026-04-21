import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { isOpenRouterConfigured } from '../lib/openrouter';
import styles from './Settings.module.css';

const AI_MODEL = 'anthropic/claude-haiku-4-5';

export default function Settings() {
  const { theme, cycle } = useTheme();
  const themeLabel =
    theme === 'system' ? 'Système' : theme === 'light' ? 'Clair' : 'Sombre';
  const { user, signOut } = useAuth();
  const configured = isOpenRouterConfigured();

  async function handleSignOut() {
    const ok = window.confirm('Se déconnecter ?');
    if (!ok) return;
    await signOut();
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <Link to="/" className={styles.back}>
          <ChevronLeft size={18} strokeWidth={1.5} /> Projets
        </Link>
        <h1 className={styles.title}>Paramètres</h1>
      </div>

      <div className={styles.content}>
      <section className={styles.section}>
        <span className={styles.sectionLabel}>Compte</span>
        <div className={styles.group}>
          <div className={styles.row}>
            <span>Email</span>
            <span className={styles.rowValue}>{user?.email ?? 'Non connecté'}</span>
          </div>
          {user && (
            <button
              type="button"
              className={`${styles.row} ${styles.rowButton}`}
              onClick={() => void handleSignOut()}
            >
              <span className={styles.danger}>Se déconnecter</span>
            </button>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.sectionLabel}>Apparence</span>
        <div className={styles.group}>
          <button
            type="button"
            className={`${styles.row} ${styles.rowButton}`}
            onClick={cycle}
          >
            <span>Thème</span>
            <span className={styles.rowValue}>{themeLabel}</span>
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.sectionLabel}>Assistant IA</span>
        <div className={styles.group}>
          <div className={styles.row}>
            <span>OpenRouter</span>
            <span className={styles.status}>
              <span
                className={`${styles.dot} ${
                  configured ? styles.dotOk : styles.dotMissing
                }`}
                aria-hidden
              />
              {configured ? 'Configuré' : 'Clé manquante'}
            </span>
          </div>
          <div className={styles.row}>
            <span>Modèle</span>
            <span className={styles.rowValueMono}>{AI_MODEL}</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.sectionLabel}>App</span>
        <div className={styles.group}>
          <div className={styles.row}>
            <span>Version</span>
            <span className={styles.rowValueMono}>{__APP_VERSION__}</span>
          </div>
        </div>
        <p className={styles.footer}>Fait avec ❤️ par Nicolas</p>
      </section>
      </div>
    </div>
  );
}

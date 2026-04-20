import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { matchPath, Outlet, useLocation } from 'react-router-dom';
import { useProject } from '../../hooks/useProject';
import { AIPanel } from '../assistant/AIPanel';
import styles from './AppShell.module.css';
import aiStyles from '../assistant/AIPanel.module.css';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';

export function AppShell() {
  const [panelOpen, setPanelOpen] = useState(false);
  const location = useLocation();

  const match = matchPath('/projects/:id', location.pathname);
  const projectId = match?.params.id;
  const { project, recentEntries } = useProject(projectId);

  const context =
    panelOpen && project
      ? { project, recentEntries }
      : undefined;

  return (
    <div className={styles.shell}>
      <Sidebar />
      <main className={styles.main}>
        <Outlet />
      </main>
      <BottomNav />

      <button
        type="button"
        className={aiStyles.fab}
        onClick={() => setPanelOpen((v) => !v)}
        aria-label="Assistant"
      >
        <Sparkles size={22} strokeWidth={1.5} />
      </button>

      {panelOpen && (
        <AIPanel onClose={() => setPanelOpen(false)} projectContext={context} />
      )}
    </div>
  );
}

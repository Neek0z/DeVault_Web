import { Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { matchPath, Outlet, useLocation } from 'react-router-dom';
import { useProject } from '../../hooks/useProject';
import { AIPanel } from '../assistant/AIPanel';
import { CommandPalette } from '../ui/CommandPalette';
import styles from './AppShell.module.css';
import aiStyles from '../assistant/AIPanel.module.css';
import { ProjectRail } from './ProjectRail';
import { Sidebar } from './Sidebar';

export function AppShell() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();

  const match = matchPath('/projects/:id', location.pathname);
  const projectId = match?.params.id;
  const { project, recentEntries } = useProject(projectId);

  const context =
    panelOpen && project
      ? { project, recentEntries }
      : undefined;

  const openAssistant = useCallback(() => setPanelOpen(true), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (mod && e.key === '/') {
        e.preventDefault();
        setPanelOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={styles.shell}>
      <Sidebar onOpenPalette={() => setPaletteOpen(true)} />
      <ProjectRail />
      <main className={styles.main}>
        <div key={location.pathname} className={styles.pageTransition}>
          <Outlet />
        </div>
      </main>

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

      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          onOpenAssistant={openAssistant}
        />
      )}
    </div>
  );
}

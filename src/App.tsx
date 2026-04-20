import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Ideas from './pages/Ideas';
import JournalNew from './pages/JournalNew';
import ProjectDetail from './pages/ProjectDetail';
import SearchPage from './pages/Search';
import Settings from './pages/Settings';

function ProtectedRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          fontSize: 13,
        }}
      >
        Chargement…
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" replace />;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="journal/new" element={<JournalNew />} />
        <Route path="ideas" element={<Ideas />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  useTheme();
  const { session, loading } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/auth"
          element={
            loading ? null : session ? <Navigate to="/" replace /> : <Auth />
          }
        />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}

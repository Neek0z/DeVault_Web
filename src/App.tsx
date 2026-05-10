import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ToastProvider } from './components/ui/Toast';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';

const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const JournalNew = lazy(() => import('./pages/JournalNew'));
const Ideas = lazy(() => import('./pages/Ideas'));
const SearchPage = lazy(() => import('./pages/Search'));
const Settings = lazy(() => import('./pages/Settings'));
const History = lazy(() => import('./pages/History'));

function PageLoader() {
  return (
    <div
      style={{
        flex: 1,
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
        <Route
          path="projects/:id"
          element={
            <Suspense fallback={<PageLoader />}>
              <ProjectDetail />
            </Suspense>
          }
        />
        <Route
          path="journal/new"
          element={
            <Suspense fallback={<PageLoader />}>
              <JournalNew />
            </Suspense>
          }
        />
        <Route
          path="ideas"
          element={
            <Suspense fallback={<PageLoader />}>
              <Ideas />
            </Suspense>
          }
        />
        <Route
          path="search"
          element={
            <Suspense fallback={<PageLoader />}>
              <SearchPage />
            </Suspense>
          }
        />
        <Route
          path="settings"
          element={
            <Suspense fallback={<PageLoader />}>
              <Settings />
            </Suspense>
          }
        />
        <Route
          path="history"
          element={
            <Suspense fallback={<PageLoader />}>
              <History />
            </Suspense>
          }
        />
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
      <ToastProvider>
        <Routes>
          <Route
            path="/auth"
            element={
              loading ? null : session ? <Navigate to="/" replace /> : <Auth />
            }
          />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}

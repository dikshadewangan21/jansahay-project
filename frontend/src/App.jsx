import { Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth  } from './components/AuthContext';
import Sidebar      from './components/Sidebar';
import ToastContainer from './components/ToastContainer';

// Pages
import LoginPage         from './pages/LoginPage';
import RegisterPage      from './pages/RegisterPage';
import DashboardPage     from './pages/DashboardPage';
import ReportsPage       from './pages/ReportsPage';
import SubmitReportPage  from './pages/SubmitReportPage';
import VolunteersPage    from './pages/VolunteersPage';
import TasksPage         from './pages/TasksPage';
import AnalyticsPage     from './pages/AnalyticsPage';
import SDGPage           from './pages/SDGPage';
import AIEnginePage      from './pages/AIEnginePage';
import MapPage           from './pages/MapPage';
import CrisisMapPage     from './pages/CrisisMapPage';

function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-pulse-bg">

      {/* ── Mobile overlay backdrop ───────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      {/* On desktop: always visible. On mobile/tablet: slide in as drawer. */}
      <div className={`
        fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:flex lg:shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-pulse-border bg-pulse-surface shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-pulse-muted hover:text-pulse-text hover:bg-white/5 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-base">🤝</span>
            <span className="text-sm font-bold text-pulse-text">JanSahay</span>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <ToastContainer />
      <Routes>
        {/* Public routes */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><AppShell><Navigate to="/dashboard" replace /></AppShell></ProtectedRoute>} />
        <Route path="/dashboard"   element={<ProtectedRoute><AppShell><DashboardPage /></AppShell></ProtectedRoute>} />
        <Route path="/reports"     element={<ProtectedRoute><AppShell><ReportsPage /></AppShell></ProtectedRoute>} />
        <Route path="/reports/new" element={<ProtectedRoute><AppShell><SubmitReportPage /></AppShell></ProtectedRoute>} />
        <Route path="/volunteers"  element={<ProtectedRoute><AppShell><VolunteersPage /></AppShell></ProtectedRoute>} />
        <Route path="/tasks"       element={<ProtectedRoute><AppShell><TasksPage /></AppShell></ProtectedRoute>} />
        <Route path="/analytics"   element={<ProtectedRoute><AppShell><AnalyticsPage /></AppShell></ProtectedRoute>} />
        <Route path="/sdg"         element={<ProtectedRoute><AppShell><SDGPage /></AppShell></ProtectedRoute>} />
        <Route path="/ai"          element={<ProtectedRoute><AppShell><AIEnginePage /></AppShell></ProtectedRoute>} />
        <Route path="/map"         element={<ProtectedRoute><AppShell><MapPage /></AppShell></ProtectedRoute>} />
        <Route path="/crisis-map"  element={<ProtectedRoute><AppShell><CrisisMapPage /></AppShell></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

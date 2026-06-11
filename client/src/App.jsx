import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import MyTasks from './pages/MyTasks';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Contracts from './pages/Contracts';
import Invoices from './pages/Invoices';
import Notifications from './pages/Notifications';
import Agents from './pages/Agents';
import Calendar from './pages/Calendar';
import Analytics from './pages/Analytics';
import Loans from './pages/Loans';
import Settings from './pages/Settings';
import useAuthStore from './store/authStore';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function App() {
  const { isAuthenticated, fetchMe } = useAuthStore();
  useEffect(() => { if (isAuthenticated) fetchMe(); }, []);

  const protect = (el) => <ProtectedRoute><Layout>{el}</Layout></ProtectedRoute>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/"         element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard"        element={protect(<Dashboard />)} />
        <Route path="/my-tasks"         element={protect(<MyTasks />)} />
        <Route path="/projects"         element={protect(<Projects />)} />
        <Route path="/projects/:id"     element={protect(<ProjectDetail />)} />
        <Route path="/clients"          element={protect(<Clients />)} />
        <Route path="/clients/:id"      element={protect(<ClientDetail />)} />
        <Route path="/agents"           element={protect(<Agents />)} />
        <Route path="/calendar"         element={protect(<Calendar />)} />
        <Route path="/contracts"        element={protect(<Contracts />)} />
        <Route path="/invoices"         element={protect(<Invoices />)} />
        <Route path="/notifications"    element={protect(<Notifications />)} />
        <Route path="/analytics"        element={protect(<Analytics />)} />
        {/* Page test standalone (style LoanProX, hors layout DevFlow) */}
        <Route path="/loans"            element={<ProtectedRoute><Loans /></ProtectedRoute>} />
        <Route path="/settings"         element={protect(<Settings />)} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Profile from '@/pages/Profile';
import AdminPanel from '@/pages/AdminPanel';
import type { ReactNode } from 'react';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { currentUser, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center">
        <div className="animate-spin w-10 h-10 border-2 border-[var(--border-color)] border-t-[var(--accent-primary)] rounded-full mx-auto mb-4" />
        <p style={{ color: 'var(--text-muted)' }}>Загрузка...</p>
      </div>
    </div>
  );
  if (!currentUser) return <Navigate to="/login" />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { currentUser, userProfile, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="animate-spin w-10 h-10 border-2 border-[var(--border-color)] border-t-[var(--accent-primary)] rounded-full" />
    </div>
  );
  if (!currentUser || !userProfile?.admin) return <Navigate to="/" />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: ReactNode }) {
  const { currentUser, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="animate-spin w-10 h-10 border-2 border-[var(--border-color)] border-t-[var(--accent-primary)] rounded-full" />
    </div>
  );
  if (currentUser) return <Navigate to="/profile" />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

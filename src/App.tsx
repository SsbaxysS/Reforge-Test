import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Profile from '@/pages/Profile';
import AdminPanel from '@/pages/AdminPanel';
import TestPage from '@/pages/TestPage';
import type { ReactNode } from 'react';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { currentUser, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
    </div>
  );
  if (!currentUser) return <Navigate to="/login" />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { currentUser, userProfile, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
    </div>
  );
  if (!currentUser || !userProfile?.admin) return <Navigate to="/" />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: ReactNode }) {
  const { currentUser, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
    </div>
  );
  if (currentUser) return <Navigate to="/profile" />;
  return <>{children}</>;
}

import { useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageTransition from '@/components/PageTransition';

function AppRoutes() {
  const location = useLocation();
  const isTestRoute = location.pathname.startsWith('/test/');

  return (
    <>
      {!isTestRoute && <Navbar />}

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/test/:testId" element={<ProtectedRoute><PageTransition><TestPage /></PageTransition></ProtectedRoute>} />
          <Route path="/" element={<PageTransition><Home /></PageTransition>} />
          <Route path="/login" element={<GuestRoute><PageTransition><Login /></PageTransition></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><PageTransition><Register /></PageTransition></GuestRoute>} />
          <Route path="/profile" element={<ProtectedRoute><PageTransition><Profile /></PageTransition></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><PageTransition><AdminPanel /></PageTransition></AdminRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AnimatePresence>

      {!isTestRoute && <BottomNav />}
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-100)',
              border: '1px solid var(--border)',
            },
            success: {
              iconTheme: { primary: 'var(--green)', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: 'var(--red)', secondary: '#fff' },
            },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

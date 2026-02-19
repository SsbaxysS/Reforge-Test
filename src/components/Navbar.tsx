import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, type Theme } from '@/contexts/ThemeContext';

const themes: { value: Theme; label: string }[] = [
  { value: 'light', label: '☀️' },
  { value: 'dark', label: '🌙' },
  { value: 'black', label: '⬛' },
];

export default function Navbar() {
  const { currentUser, userProfile, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/', label: 'Главная' },
    ...(currentUser ? [{ path: '/profile', label: 'Профиль' }] : []),
    ...(userProfile?.admin ? [{ path: '/admin', label: 'Управление' }] : []),
  ];

  const cycleTheme = () => {
    const idx = themes.findIndex(t => t.value === theme);
    setTheme(themes[(idx + 1) % themes.length].value);
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl transition-all duration-500"
      style={{ background: 'var(--bg-nav)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <span className="text-white font-bold text-xs">R</span>
          </div>
          <span className="font-semibold text-sm tracking-tight" style={{ color: 'var(--text-100)' }}>
            Reforge Test
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(l => (
            <Link
              key={l.path}
              to={l.path}
              className="px-3.5 py-2 text-[13px] transition-colors duration-300"
              style={{ color: isActive(l.path) ? 'var(--text-100)' : 'var(--text-500)' }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right */}
        <div className="hidden md:flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={cycleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200"
            style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}
            title="Сменить тему"
          >
            <span className="text-sm">{themes.find(t => t.value === theme)?.label}</span>
          </button>

          {currentUser ? (
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}
              >
                <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style={{ background: 'var(--accent)' }}>
                  {userProfile?.firstName?.charAt(0) || 'U'}
                </div>
                <span className="text-[13px] font-medium" style={{ color: 'var(--text-200)' }}>
                  {userProfile?.firstName || 'User'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="text-[13px] transition-colors duration-200"
                style={{ color: 'var(--text-500)' }}
              >
                Выйти
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-[13px] transition-colors duration-200" style={{ color: 'var(--text-500)' }}>
                Войти
              </Link>
              <Link
                to="/register"
                className="text-[13px] font-medium text-white px-4 py-2 rounded-lg transition-colors duration-200"
                style={{ background: 'var(--accent)' }}
              >
                Начать
              </Link>
            </div>
          )}
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-2">
          <button onClick={cycleTheme} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ border: '1px solid var(--border)' }}>
            <span className="text-sm">{themes.find(t => t.value === theme)?.label}</span>
          </button>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="w-10 h-10 flex flex-col items-center justify-center gap-1.5">
            <span className={`w-5 h-px transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-[3.5px]' : ''}`} style={{ background: 'var(--text-400)' }} />
            <span className={`w-5 h-px transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-[3.5px]' : ''}`} style={{ background: 'var(--text-400)' }} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-400 ${mobileOpen ? 'max-h-96' : 'max-h-0'}`}>
        <div className="backdrop-blur-2xl px-6 py-4 space-y-1" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-nav)' }}>
          {navLinks.map(l => (
            <Link
              key={l.path}
              to={l.path}
              className="block py-3 text-[15px] transition-colors"
              style={{ color: isActive(l.path) ? 'var(--text-100)' : 'var(--text-500)', borderBottom: '1px solid var(--border)' }}
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          {currentUser ? (
            <button
              onClick={() => { handleLogout(); setMobileOpen(false); }}
              className="block w-full text-left py-3 text-[15px] transition-colors"
              style={{ color: 'var(--red)' }}
            >
              Выйти
            </button>
          ) : (
            <div className="space-y-2 pt-2">
              <Link to="/login" className="block py-3 text-[15px]" style={{ color: 'var(--text-500)' }} onClick={() => setMobileOpen(false)}>Войти</Link>
              <Link
                to="/register"
                className="block text-center py-3 text-[15px] font-medium text-white rounded-xl"
                style={{ background: 'var(--accent)' }}
                onClick={() => setMobileOpen(false)}
              >
                Начать
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, type Theme } from '@/contexts/ThemeContext';

const themeOptions: { value: Theme; icon: string; label: string }[] = [
  { value: 'light', icon: '☀️', label: 'Светлая' },
  { value: 'dark', icon: '🌙', label: 'Тёмная' },
  { value: 'black', icon: '🖤', label: 'Чёрная' },
];

export default function Navbar() {
  const { currentUser, userProfile, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      className="sticky top-0 z-50 backdrop-blur-2xl transition-all duration-300"
      style={{
        background: 'var(--bg-nav)',
        borderBottom: '1px solid var(--border-color)',
        boxShadow: '0 4px 30px rgba(0,0,0,0.1)'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                boxShadow: '0 4px 15px var(--accent-glow)'
              }}
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Reforge Test
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { path: '/', label: 'Главная' },
              ...(currentUser ? [{ path: '/profile', label: 'Мой профиль' }] : []),
              ...(userProfile?.admin ? [{ path: '/admin', label: '⚙️ Управление' }] : []),
            ].map(link => (
              <Link
                key={link.path}
                to={link.path}
                className="relative px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300"
                style={{
                  color: isActive(link.path) ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive(link.path) ? 'var(--bg-card-hover)' : 'transparent',
                  boxShadow: isActive(link.path) ? 'var(--shadow-card)' : 'none'
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {/* Theme Switcher */}
            <div className="relative">
              <button
                onClick={() => setThemeOpen(!themeOpen)}
                className="p-2 rounded-xl transition-all duration-300 hover:scale-105"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                title="Сменить тему"
              >
                <span className="text-lg">{themeOptions.find(t => t.value === theme)?.icon}</span>
              </button>
              {themeOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setThemeOpen(false)} />
                  <div
                    className="absolute right-0 top-12 z-50 rounded-xl overflow-hidden animate-fade-in-up"
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      boxShadow: 'var(--shadow-card)',
                      minWidth: 160
                    }}
                  >
                    {themeOptions.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setTheme(opt.value); setThemeOpen(false); }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-sm font-medium transition-all duration-200"
                        style={{
                          color: theme === opt.value ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          background: theme === opt.value ? 'var(--bg-card-hover)' : 'transparent'
                        }}
                      >
                        <span>{opt.icon}</span>
                        {opt.label}
                        {theme === opt.value && <span className="ml-auto text-xs">✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Auth */}
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}
                  >
                    {userProfile?.firstName?.charAt(0) || 'U'}
                  </div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {userProfile?.firstName || 'User'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 hover:bg-red-500/10 hover:text-red-400"
                  style={{
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  Выйти
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-5 py-2 text-sm font-semibold rounded-xl transition-all duration-300"
                  style={{ color: 'var(--text-secondary)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                >
                  Войти
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2 text-sm font-bold text-white rounded-xl transition-all duration-300 hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                    boxShadow: '0 4px 15px var(--accent-glow)'
                  }}
                >
                  Регистрация
                </Link>
              </div>
            )}
          </div>

          {/* Mobile burger */}
          <div className="flex md:hidden items-center gap-2">
            {/* Mobile theme */}
            <button
              onClick={() => {
                const idx = themeOptions.findIndex(t => t.value === theme);
                setTheme(themeOptions[(idx + 1) % themeOptions.length].value);
              }}
              className="p-2 rounded-xl"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            >
              <span className="text-base">{themeOptions.find(t => t.value === theme)?.icon}</span>
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-xl"
              style={{ color: 'var(--text-primary)' }}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden backdrop-blur-xl animate-fade-in-up"
          style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-nav)' }}
        >
          <div className="px-4 py-4 space-y-1">
            {[
              { path: '/', label: 'Главная' },
              ...(currentUser ? [{ path: '/profile', label: 'Мой профиль' }] : []),
              ...(userProfile?.admin ? [{ path: '/admin', label: '⚙️ Управление' }] : []),
            ].map(link => (
              <Link
                key={link.path}
                to={link.path}
                className="block px-4 py-3 rounded-xl transition-all font-medium text-sm"
                style={{
                  color: isActive(link.path) ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive(link.path) ? 'var(--bg-card-hover)' : 'transparent'
                }}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
              {currentUser ? (
                <button
                  onClick={() => { handleLogout(); setMobileOpen(false); }}
                  className="w-full text-left px-4 py-3 rounded-xl transition text-red-400 hover:bg-red-500/10 text-sm font-medium"
                >
                  Выйти
                </button>
              ) : (
                <div className="space-y-2">
                  <Link to="/login" className="block px-4 py-3 rounded-xl transition text-sm font-medium" style={{ color: 'var(--text-secondary)' }} onClick={() => setMobileOpen(false)}>Войти</Link>
                  <Link
                    to="/register"
                    className="block px-4 py-3 rounded-xl transition text-sm font-bold text-white text-center"
                    style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}
                    onClick={() => setMobileOpen(false)}
                  >
                    Регистрация
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

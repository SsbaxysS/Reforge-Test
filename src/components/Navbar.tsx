import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, LogOut, ArrowRight, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, type Theme } from '@/contexts/ThemeContext';

const themes: { value: Theme; icon: any; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Светлая' },
  { value: 'dark', icon: Moon, label: 'Тёмная' },
];

export default function Navbar() {
  const { currentUser, userProfile, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

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

  const ThemeIcon = themes.find(t => t.value === theme)?.icon || Sun;

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl transition-all duration-500 pt-[env(safe-area-inset-top)]"
      style={{ background: 'var(--bg-nav)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'var(--accent)' }}>
            <span className="text-white font-bold text-[13px]">R</span>
          </div>
          <span className="font-bold text-[15px] tracking-tight hidden sm:block" style={{ color: 'var(--text-100)' }}>
            Reforge Test
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2">
          {navLinks.map(l => (
            <Link
              key={l.path}
              to={l.path}
              className="px-4 py-2 text-[13px] font-medium rounded-full transition-all duration-300"
              style={{
                color: isActive(l.path) ? 'var(--text-100)' : 'var(--text-500)',
                background: isActive(l.path) ? 'var(--bg-card)' : 'transparent',
                border: isActive(l.path) ? '1px solid var(--border)' : '1px solid transparent'
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5">
          {/* Theme toggle */}
          <button
            onClick={cycleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 hover:scale-105 active:scale-95"
            style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}
            title="Сменить тему"
          >
            <ThemeIcon size={16} style={{ color: 'var(--text-300)' }} />
          </button>

          {currentUser ? (
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full"
                style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm" style={{ background: 'var(--accent)' }}>
                  {userProfile?.firstName?.charAt(0) || 'U'}
                </div>
                <span className="text-[12px] font-medium hidden sm:block" style={{ color: 'var(--text-200)' }}>
                  {userProfile?.firstName || 'User'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 hover:bg-neutral-500/10 active:scale-95"
                title="Выйти"
              >
                <LogOut size={16} style={{ color: 'var(--text-500)' }} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium rounded-xl transition-all hover:bg-neutral-500/5"
                style={{ color: 'var(--text-400)' }}
              >
                <LogIn size={14} />
                Войти
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-1.5 px-4 sm:px-5 py-2 text-[13px] font-semibold text-white rounded-xl transition-all hover:shadow-lg hover:scale-105 active:scale-95"
                style={{ background: 'var(--accent)', boxShadow: '0 4px 14px 0 rgba(139,92,246,0.39)' }}
              >
                Начать <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

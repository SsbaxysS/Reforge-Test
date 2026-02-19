import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/profile');
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === 'auth/user-not-found') setError('Пользователь не найден');
      else if (firebaseError.code === 'auth/wrong-password') setError('Неверный пароль');
      else if (firebaseError.code === 'auth/invalid-email') setError('Неверный формат email');
      else if (firebaseError.code === 'auth/invalid-credential') setError('Неверный email или пароль');
      else setError('Ошибка входа. Попробуйте снова.');
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/profile');
    } catch {
      setError('Ошибка входа через Google');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--bg-primary)' }}>
      {/* BG Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-1/4 w-72 h-72 rounded-full blur-[100px] animate-float" style={{ background: 'var(--accent-glow)', opacity: 0.4 }} />
        <div className="absolute bottom-20 left-1/4 w-72 h-72 rounded-full blur-[100px] animate-float" style={{ background: 'var(--accent-glow)', opacity: 0.3, animationDelay: '3s' }} />
      </div>

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="glass rounded-3xl p-8" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                boxShadow: '0 8px 25px var(--accent-glow)'
              }}
            >
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Вход</h1>
            <p className="mt-2" style={{ color: 'var(--text-muted)' }}>Войдите в свой аккаунт Reforge Test</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm text-center animate-fade-in-up">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3.5 rounded-xl transition-all duration-300 outline-none"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                }}
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Пароль</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3.5 rounded-xl transition-all duration-300 outline-none"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                }}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-white font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                boxShadow: '0 8px 25px var(--accent-glow)'
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Вход...
                </span>
              ) : 'Войти'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>или</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full py-3.5 font-medium rounded-xl transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 glass hover:scale-[1.02]"
            style={{ color: 'var(--text-primary)' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Войти через Google
          </button>

          <p className="mt-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Нет аккаунта?{' '}
            <Link to="/register" className="font-semibold transition-colors" style={{ color: 'var(--accent-primary)' }}>
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

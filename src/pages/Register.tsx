import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Register() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError('Введите имя и фамилию');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, firstName.trim(), lastName.trim());
      navigate('/profile');
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === 'auth/email-already-in-use') setError('Этот email уже зарегистрирован');
      else if (firebaseError.code === 'auth/invalid-email') setError('Неверный формат email');
      else if (firebaseError.code === 'auth/weak-password') setError('Пароль слишком слабый');
      else setError('Ошибка регистрации. Попробуйте снова.');
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

  const inputStyle = {
    background: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--bg-primary)' }}>
      {/* BG Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 left-1/3 w-72 h-72 rounded-full blur-[100px] animate-float" style={{ background: 'var(--accent-glow)', opacity: 0.4 }} />
        <div className="absolute bottom-40 right-1/3 w-72 h-72 rounded-full blur-[100px] animate-float" style={{ background: 'var(--accent-glow)', opacity: 0.3, animationDelay: '3s' }} />
      </div>

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="glass rounded-3xl p-8" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{
                background: 'linear-gradient(135deg, var(--accent-secondary), var(--accent-primary))',
                boxShadow: '0 8px 25px var(--accent-glow)'
              }}
            >
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Регистрация</h1>
            <p className="mt-2" style={{ color: 'var(--text-muted)' }}>Создайте аккаунт Reforge Test</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm text-center animate-fade-in-up">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Имя</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl transition-all duration-300 outline-none"
                  style={inputStyle}
                  placeholder="Иван"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Фамилия</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl transition-all duration-300 outline-none"
                  style={inputStyle}
                  placeholder="Иванов"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl transition-all duration-300 outline-none"
                style={inputStyle}
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
                className="w-full px-4 py-3 rounded-xl transition-all duration-300 outline-none"
                style={inputStyle}
                placeholder="Минимум 6 символов"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Подтвердите пароль</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl transition-all duration-300 outline-none"
                style={inputStyle}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-white font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, var(--accent-secondary), var(--accent-primary))',
                boxShadow: '0 8px 25px var(--accent-glow)'
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Регистрация...
                </span>
              ) : 'Создать аккаунт'}
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
            Зарегистрироваться через Google
          </button>

          <p className="mt-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Уже есть аккаунт?{' '}
            <Link to="/login" className="font-semibold transition-colors" style={{ color: 'var(--accent-primary)' }}>
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

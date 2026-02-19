import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
          backgroundSize: '80px 80px'
        }} />

        {/* Content */}
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center pt-14">
          {/* Badge */}
          <div
            className="animate-fade-in-up stagger-1 inline-flex items-center gap-2 text-xs px-4 py-1.5 rounded-full mb-8"
            style={{ color: 'var(--text-400)', border: '1px solid var(--border)', background: 'var(--bg-card)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
            Платформа тестирования
          </div>

          {/* Title */}
          <h1
            className="animate-fade-in-up stagger-2 text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6"
            style={{ color: 'var(--text-100)' }}
          >
            Reforge Test
          </h1>

          <p className="animate-fade-in-up stagger-3 text-lg max-w-xl mx-auto mb-4 leading-relaxed font-light" style={{ color: 'var(--text-500)' }}>
            Современная платформа для проведения тестов и экзаменов в школе
          </p>

          <p className="animate-fade-in-up stagger-4 text-[15px] max-w-md mx-auto mb-10 leading-relaxed" style={{ color: 'var(--text-600)' }}>
            Мгновенные результаты, удобная связь с учителями и полная аналитика успеваемости
          </p>

          {/* CTA */}
          <div className="animate-fade-in-up stagger-5 flex flex-col sm:flex-row items-center justify-center gap-3">
            {currentUser ? (
              <Link
                to="/profile"
                className="flex items-center gap-2 text-white px-7 py-3.5 rounded-xl font-medium text-sm transition-all hover:shadow-lg"
                style={{ background: 'var(--accent)', boxShadow: '0 0 30px rgba(139,92,246,0.15)' }}
              >
                Перейти в профиль
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="flex items-center gap-2 text-white px-7 py-3.5 rounded-xl font-medium text-sm transition-all hover:shadow-lg"
                  style={{ background: 'var(--accent)', boxShadow: '0 0 30px rgba(139,92,246,0.15)' }}
                >
                  Начать бесплатно
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm transition-all duration-300"
                  style={{ color: 'var(--text-400)', border: '1px solid var(--border)' }}
                >
                  Уже есть аккаунт
                </Link>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="animate-fade-in-up stagger-6 mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-xl mx-auto">
            {[
              { val: '⚡', label: 'Мгновенно' },
              { val: '📊', label: 'Аналитика' },
              { val: '💬', label: 'Чат' },
              { val: '🔒', label: 'Безопасность' },
            ].map(s => (
              <div
                key={s.label}
                className="text-center py-3 rounded-xl"
                style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}
              >
                <div className="text-xl mb-1">{s.val}</div>
                <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-600)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[var(--bg)] to-transparent" />
      </section>

      {/* Features */}
      <section className="relative py-28 z-[1]">
        <div className="section-divider max-w-6xl mx-auto mb-28" />

        <div className="max-w-6xl mx-auto px-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
            <div>
              <p className="text-[12px] font-mono tracking-[0.2em] uppercase mb-4" style={{ color: 'var(--accent-light)' }}>
                // Возможности
              </p>
              <h2 className="font-bold text-3xl md:text-4xl tracking-tight leading-tight" style={{ color: 'var(--text-100)' }}>
                Всё необходимое.<br />
                <span style={{ color: 'var(--text-600)' }}>Ничего лишнего.</span>
              </h2>
            </div>
            <p className="text-[14px] max-w-sm leading-relaxed" style={{ color: 'var(--text-500)' }}>
              Каждая функция создана для удобного и честного тестирования учеников.
            </p>
          </div>

          {/* Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: '◎',
                title: 'Тесты и экзамены',
                desc: 'Различные типы вопросов, ограничение времени и автоматическая проверка результатов.',
                tags: ['Автопроверка', 'Таймер', 'Разные типы'],
              },
              {
                icon: '◈',
                title: 'Профиль ученика',
                desc: 'Полная история тестов, статистика успеваемости и персональный прогресс обучения.',
                tags: ['История', 'Статистика', 'Прогресс'],
              },
              {
                icon: '⟐',
                title: 'Связь с учителем',
                desc: 'Встроенный чат для обсуждения результатов и получения обратной связи.',
                tags: ['Мессенджер', 'Уведомления', 'Обратная связь'],
              },
              {
                icon: '⬡',
                title: 'Аналитика',
                desc: 'Подробная статистика по каждому тесту с визуализацией и трендами.',
                tags: ['Графики', 'Тренды', 'Экспорт'],
              },
              {
                icon: '⊞',
                title: 'Быстрый старт',
                desc: 'Вход через email или Google за несколько секунд — никаких сложностей.',
                tags: ['Email', 'Google', 'Быстро'],
              },
              {
                icon: '⊘',
                title: 'Безопасность',
                desc: 'Firebase аутентификация, шифрование данных и защита аккаунтов.',
                tags: ['Firebase', 'Шифрование', 'Защита'],
              },
            ].map((f, i) => (
              <div
                key={i}
                className="glow-card group relative p-7 rounded-2xl transition-all duration-500"
                style={{
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--bg-card-hover)';
                  e.currentTarget.style.borderColor = 'var(--border-hover)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--bg-card)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: 'radial-gradient(circle at 50% 0%, rgba(139,92,246,0.04), transparent 60%)' }}
                />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl transition-colors duration-500" style={{ color: 'var(--text-700)' }}>{f.icon}</span>
                    <h3 className="font-semibold text-[16px]" style={{ color: 'var(--text-100)' }}>{f.title}</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed mb-5 group-hover:text-[var(--text-400)] transition-colors duration-500" style={{ color: 'var(--text-500)' }}>
                    {f.desc}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {f.tags.map(tag => (
                      <span
                        key={tag}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-md transition-all duration-500"
                        style={{ color: 'var(--text-700)', border: '1px solid var(--border)' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative py-28">
        <div className="section-divider max-w-6xl mx-auto mb-28" />

        <div className="max-w-5xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-[12px] font-mono tracking-[0.2em] uppercase mb-4" style={{ color: 'var(--accent-light)' }}>
              // Процесс
            </p>
            <h2 className="font-bold text-3xl md:text-4xl tracking-tight" style={{ color: 'var(--text-100)' }}>
              Как это работает
            </h2>
          </div>

          <div className="space-y-6">
            {[
              { step: '01', title: 'Регистрация', desc: 'Создайте аккаунт с помощью email или Google за несколько секунд' },
              { step: '02', title: 'Прохождение теста', desc: 'Выберите доступный тест и пройдите его в удобном интерфейсе' },
              { step: '03', title: 'Мгновенный результат', desc: 'Узнайте свой балл и разбор ошибок сразу после завершения' },
              { step: '04', title: 'Обратная связь', desc: 'Обсудите результаты с учителем через встроенный мессенджер' },
            ].map((item, i) => (
              <div
                key={i}
                className="flex gap-6 items-start group p-5 rounded-2xl transition-all duration-500"
                style={{ border: '1px solid transparent' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent'; }}
              >
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold transition-transform duration-300 group-hover:scale-105"
                  style={{ background: 'var(--accent)' }}
                >
                  {item.step}
                </div>
                <div className="pt-1 flex-1">
                  <h3 className="font-semibold text-[16px] mb-1" style={{ color: 'var(--text-100)' }}>{item.title}</h3>
                  <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-500)' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style={{ background: 'var(--accent)' }}>R</div>
            <span className="text-sm" style={{ color: 'var(--text-600)' }}>© 2025 Reforge Test</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
